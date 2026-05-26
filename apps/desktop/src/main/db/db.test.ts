import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase } from "./client.js";
import { checkDatabaseHealth } from "./health.js";
import { runMigrations } from "./migrate.js";
import { setDatabasePathForTests } from "./paths.js";
import { ensureDefaultData, ensureDefaultProject } from "./seed.js";
import { openProjectFromPath } from "./repositories/projectRepository.js";
import { startAgentRun, finishAgentRun } from "./repositories/agentRunRepository.js";
import {
  createAgentProfile,
  deleteAgentProfile,
  listAgentProfiles,
  updateAgentProfile
} from "./repositories/agentProfileRepository.js";
import {
  createFixTaskFromQualityCheck,
  createQualityCommand,
  listQualityCommands,
  saveQualityCheck,
  updateQualityCommand
} from "./repositories/qualityRepository.js";
import {
  createTask,
  deleteTask,
  listTasks,
  setTaskStatus,
  updateTask
} from "./repositories/taskRepository.js";
import {
  appendTerminalLogChunk,
  buildTranscript,
  getTerminalLogMeta,
  listTerminalLogChunks
} from "./repositories/terminalLogRepository.js";
import Database from "better-sqlite3";

const resetDatabase = (): void => {
  closeDatabase();
  setDatabasePathForTests(null);
};

describe("database", () => {
  let databaseDirectory = "";

  beforeEach(() => {
    databaseDirectory = mkdtempSync(join(tmpdir(), "agentdesk-db-"));
    setDatabasePathForTests(join(databaseDirectory, "agentdesk.db"));
  });

  afterEach(() => {
    resetDatabase();
    rmSync(databaseDirectory, { recursive: true, force: true });
  });

  it("applies migrations only once", () => {
    const sqlite = new Database(join(databaseDirectory, "repeat.db"));
    runMigrations(sqlite);
    runMigrations(sqlite);

    const rows = sqlite.prepare("SELECT id FROM schema_migrations").all() as { id: string }[];
    expect(rows).toHaveLength(4);
    sqlite.close();
  });

  it("passes health check and stores terminal log chunks", () => {
    const health = checkDatabaseHealth(join(databaseDirectory, "agentdesk.db"));
    expect(health.ok).toBe(true);

    ensureDefaultProject();
    const projectDirectory = join(databaseDirectory, "probe-project");
    mkdirSync(projectDirectory, { recursive: true });
    const { project } = openProjectFromPath(projectDirectory);

    const runId = startAgentRun({
      projectId: project.id,
      terminalSessionId: "session-1",
      command: "powershell.exe",
      cwd: projectDirectory
    });

    appendTerminalLogChunk(runId, "line-one\n");
    appendTerminalLogChunk(runId, "line-two\n");

    const meta = getTerminalLogMeta(runId);
    expect(meta.chunkCount).toBe(2);
    expect(meta.characterCount).toBe("line-one\nline-two\n".length);

    const chunks = listTerminalLogChunks(runId, 0, 10);
    expect(chunks).toHaveLength(2);
    expect(buildTranscript(runId)).toBe("line-one\nline-two\n");

    finishAgentRun(runId, "completed", 0);
  });

  it("creates, updates, moves, and deletes task contracts", () => {
    ensureDefaultProject();
    const projectDirectory = join(databaseDirectory, "task-project");
    mkdirSync(projectDirectory, { recursive: true });
    const { project } = openProjectFromPath(projectDirectory);

    const task = createTask({
      projectId: project.id,
      title: "Implement task board",
      description: "Create persisted task management.",
      status: "backlog",
      priority: "high",
      goal: "Track AgentDesk work.",
      context: "Phase 3 task board.",
      acceptanceCriteria: "Tasks can be created and grouped.",
      filesLikelyAffected: "apps/desktop/src",
      qualityCommands: "npm test",
      securityNotes: "Renderer must use IPC.",
      doneDefinition: "Quality commands pass.",
      dependsOn: "TASK-0301"
    });

    expect(listTasks(project.id)).toHaveLength(1);
    expect(task.goal).toBe("Track AgentDesk work.");

    const updated = updateTask({
      projectId: project.id,
      id: task.id,
      title: "Implement kanban board",
      description: task.description,
      status: "ready",
      priority: "medium",
      goal: task.goal,
      context: task.context,
      acceptanceCriteria: task.acceptanceCriteria,
      filesLikelyAffected: task.filesLikelyAffected,
      qualityCommands: task.qualityCommands,
      securityNotes: task.securityNotes,
      doneDefinition: task.doneDefinition,
      dependsOn: task.dependsOn
    });

    expect(updated.title).toBe("Implement kanban board");
    expect(updated.status).toBe("ready");
    expect(updated.priority).toBe("medium");

    const moved = setTaskStatus({ projectId: project.id, id: task.id, status: "needs_review" });
    expect(moved.status).toBe("needs_review");

    deleteTask(task.id, project.id);
    expect(listTasks(project.id)).toHaveLength(0);
  });

  it("seeds and manages agent profiles", () => {
    ensureDefaultData();
    const seededProfiles = listAgentProfiles();
    expect(seededProfiles.map((profile) => profile.name)).toEqual(
      expect.arrayContaining(["Codex", "OpenCode", "Kiro CLI", "Devin CLI", "Claude Code", "Custom Command"])
    );

    const created = createAgentProfile({
      name: "Local Agent",
      command: "local-agent",
      argsTemplate: "--prompt {{prompt}}",
      shell: "powershell",
      mode: "one_shot",
      envText: "LOCAL_AGENT=1",
      workingDirectoryBehavior: "project_root",
      promptDelivery: "argument"
    });

    expect(created.envText).toBe("LOCAL_AGENT=1");

    const updated = updateAgentProfile({
      ...created,
      name: "Local Agent Updated",
      promptDelivery: "send_to_stdin"
    });

    expect(updated.name).toBe("Local Agent Updated");
    expect(updated.promptDelivery).toBe("send_to_stdin");

    deleteAgentProfile(updated.id);
    expect(listAgentProfiles().some((profile) => profile.id === updated.id)).toBe(false);
  });

  it("configures quality commands and creates fix tasks from failed checks", () => {
    const projectDirectory = join(databaseDirectory, "quality-project");
    mkdirSync(projectDirectory, { recursive: true });
    const { project } = openProjectFromPath(projectDirectory);

    const defaultCommands = listQualityCommands(project.id);
    expect(defaultCommands.map((command) => command.command)).toEqual(
      expect.arrayContaining(["npm run lint", "npm run typecheck", "npm test", "npm run build"])
    );

    const customCommand = createQualityCommand({
      projectId: project.id,
      label: "Echo",
      command: "node -e \"console.log('ok')\"",
      required: false,
      timeoutMs: 10_000
    });

    const updatedCommand = updateQualityCommand({
      ...customCommand,
      label: "Echo OK",
      required: true
    });
    expect(updatedCommand.label).toBe("Echo OK");
    expect(updatedCommand.required).toBe(true);

    const failedCheck = saveQualityCheck({
      projectId: project.id,
      label: "Typecheck",
      command: "npm run typecheck",
      status: "failed",
      output: "Type error",
      exitCode: 2,
      startedAt: new Date(0).toISOString(),
      finishedAt: new Date(1).toISOString()
    });

    const fixTask = createFixTaskFromQualityCheck({
      projectId: project.id,
      qualityCheckId: failedCheck.id
    });

    expect(fixTask.title).toContain("Fix quality check");
    expect(fixTask.context).toContain("Type error");
  });
});
