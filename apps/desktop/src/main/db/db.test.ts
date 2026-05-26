import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase } from "./client.js";
import { checkDatabaseHealth } from "./health.js";
import { runMigrations } from "./migrate.js";
import { setDatabasePathForTests } from "./paths.js";
import { ensureDefaultProject } from "./seed.js";
import { openProjectFromPath } from "./repositories/projectRepository.js";
import { startAgentRun, finishAgentRun } from "./repositories/agentRunRepository.js";
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
    expect(rows).toHaveLength(2);
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
      doneDefinition: "Quality commands pass."
    });

    expect(listTasks(project.id)).toHaveLength(1);
    expect(task.goal).toBe("Track AgentDesk work.");

    const updated = updateTask({
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
      doneDefinition: task.doneDefinition
    });

    expect(updated.title).toBe("Implement kanban board");
    expect(updated.status).toBe("ready");
    expect(updated.priority).toBe("medium");

    const moved = setTaskStatus({ id: task.id, status: "needs_review" });
    expect(moved.status).toBe("needs_review");

    deleteTask(task.id);
    expect(listTasks(project.id)).toHaveLength(0);
  });
});
