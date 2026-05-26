import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "../client.js";
import { setDatabasePathForTests } from "../paths.js";
import { agentRuns } from "../schema.js";
import { ensureDefaultProject } from "../seed.js";
import { finishAgentRun, startAgentRun } from "./agentRunRepository.js";
import { openProjectFromPath } from "./projectRepository.js";
import {
  assertTaskBelongsToProject,
  createTask,
  deleteTask,
  updateTask
} from "./taskRepository.js";

const resetDatabase = (): void => {
  closeDatabase();
  setDatabasePathForTests(null);
};

const emptyTaskInput = (projectId: string, title: string) => ({
  projectId,
  title,
  description: "",
  status: "backlog" as const,
  priority: "medium" as const,
  goal: "",
  context: "",
  acceptanceCriteria: "",
  filesLikelyAffected: "",
  qualityCommands: "",
  securityNotes: "",
  doneDefinition: "",
  dependsOn: ""
});

describe("taskRepository", () => {
  let databaseDirectory = "";

  beforeEach(() => {
    databaseDirectory = mkdtempSync(join(tmpdir(), "agentdesk-task-repo-"));
    setDatabasePathForTests(join(databaseDirectory, "agentdesk.db"));
    ensureDefaultProject();
  });

  afterEach(() => {
    resetDatabase();
    rmSync(databaseDirectory, { recursive: true, force: true });
  });

  it("rejects cross-project task updates", () => {
    const firstDirectory = join(databaseDirectory, "project-a");
    const secondDirectory = join(databaseDirectory, "project-b");
    mkdirSync(firstDirectory, { recursive: true });
    mkdirSync(secondDirectory, { recursive: true });

    const { project: firstProject } = openProjectFromPath(firstDirectory);
    const { project: secondProject } = openProjectFromPath(secondDirectory);

    const task = createTask(emptyTaskInput(firstProject.id, "Scoped task"));

    expect(() => assertTaskBelongsToProject(task.id, secondProject.id)).toThrow(
      "Task was not found for this project."
    );

    expect(() =>
      updateTask({
        ...emptyTaskInput(secondProject.id, "Hijacked"),
        id: task.id,
        status: "ready"
      })
    ).toThrow("Task was not found for this project.");
  });

  it("deletes tasks and clears linked run references", () => {
    const projectDirectory = join(databaseDirectory, "linked-runs");
    mkdirSync(projectDirectory, { recursive: true });
    const { project } = openProjectFromPath(projectDirectory);

    const task = createTask({
      ...emptyTaskInput(project.id, "Linked task"),
      status: "running",
      dependsOn: "TASK-0101"
    });

    const runId = startAgentRun({
      projectId: project.id,
      terminalSessionId: "session-linked",
      command: "powershell.exe",
      cwd: projectDirectory
    });

    getDatabase().update(agentRuns).set({ taskId: task.id }).where(eq(agentRuns.id, runId)).run();
    finishAgentRun(runId, "completed", 0);

    deleteTask(task.id, project.id);

    const run = getDatabase().select().from(agentRuns).where(eq(agentRuns.id, runId)).get();
    expect(run?.taskId).toBeNull();
  });

  it("throws when deleting a task for the wrong project", () => {
    const firstDirectory = join(databaseDirectory, "delete-a");
    const secondDirectory = join(databaseDirectory, "delete-b");
    mkdirSync(firstDirectory, { recursive: true });
    mkdirSync(secondDirectory, { recursive: true });

    const { project: firstProject } = openProjectFromPath(firstDirectory);
    const { project: secondProject } = openProjectFromPath(secondDirectory);
    const task = createTask(emptyTaskInput(firstProject.id, "Protected task"));

    expect(() => deleteTask(task.id, secondProject.id)).toThrow(
      "Task was not found for this project."
    );
  });
});
