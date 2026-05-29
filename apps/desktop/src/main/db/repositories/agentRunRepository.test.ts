import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase } from "../client.js";
import { setDatabasePathForTests } from "../paths.js";
import { openProjectFromPath } from "./projectRepository.js";
import {
  assertRunBelongsToProject,
  finishAgentRun,
  getAgentRun,
  reconcileInterruptedRuns,
  startAgentRun
} from "./agentRunRepository.js";
import { createTask, getTaskById, setTaskStatus } from "./taskRepository.js";

const resetDatabase = (): void => {
  closeDatabase();
  setDatabasePathForTests(null);
};

describe("agentRunRepository", () => {
  let databaseDirectory = "";

  beforeEach(() => {
    databaseDirectory = join(tmpdir(), `agentdesk-runs-${Date.now()}`);
    mkdirSync(databaseDirectory, { recursive: true });
    setDatabasePathForTests(join(databaseDirectory, "agentdesk.db"));
  });

  afterEach(() => {
    resetDatabase();
    rmSync(databaseDirectory, { recursive: true, force: true });
  });

  it("stores runs under the selected project and enforces project ownership", () => {
    const projectDirectory = join(databaseDirectory, "repo");
    mkdirSync(projectDirectory, { recursive: true });

    const { project: firstProject } = openProjectFromPath(projectDirectory);
    const otherDirectory = join(databaseDirectory, "other");
    mkdirSync(otherDirectory, { recursive: true });
    const { project: otherProject } = openProjectFromPath(otherDirectory);

    const runId = startAgentRun({
      projectId: firstProject.id,
      terminalSessionId: "session-1",
      command: "powershell.exe",
      cwd: projectDirectory
    });

    const run = getAgentRun(runId);
    expect(run?.projectId).toBe(firstProject.id);

    const task = createTask({
      projectId: firstProject.id,
      title: "Linked run task",
      description: "",
      status: "ready",
      priority: "medium",
      goal: "",
      context: "",
      acceptanceCriteria: "",
      filesLikelyAffected: "",
      qualityCommands: "",
      securityNotes: "",
      doneDefinition: "",
      dependsOn: ""
    });

    const linkedRunId = startAgentRun({
      projectId: firstProject.id,
      terminalSessionId: "session-linked",
      command: "powershell.exe",
      cwd: projectDirectory,
      taskId: task.id,
      prompt: "Implement the task."
    });

    const linkedRun = getAgentRun(linkedRunId);
    expect(linkedRun?.taskId).toBe(task.id);
    expect(linkedRun?.prompt).toBe("Implement the task.");

    assertRunBelongsToProject(runId, firstProject.id);
    expect(() => assertRunBelongsToProject(runId, otherProject.id)).toThrow(
      /not found for this project/i
    );
  });

  it("records an error message when a run is finished as failed", () => {
    const projectDirectory = join(databaseDirectory, "repo");
    mkdirSync(projectDirectory, { recursive: true });
    const { project } = openProjectFromPath(projectDirectory);

    const runId = startAgentRun({
      projectId: project.id,
      terminalSessionId: "session-fail",
      command: "missing-agent",
      cwd: projectDirectory
    });

    finishAgentRun(runId, "failed", undefined, "Failed to start: command not found.");

    const run = getAgentRun(runId);
    expect(run?.status).toBe("failed");
    expect(run?.errorMessage).toMatch(/command not found/i);
  });

  it("reconciles interrupted running runs and resets their linked tasks", () => {
    const projectDirectory = join(databaseDirectory, "repo");
    mkdirSync(projectDirectory, { recursive: true });
    const { project } = openProjectFromPath(projectDirectory);

    const task = createTask({
      projectId: project.id,
      title: "Interrupted task",
      description: "",
      status: "ready",
      priority: "medium",
      goal: "",
      context: "",
      acceptanceCriteria: "",
      filesLikelyAffected: "",
      qualityCommands: "",
      securityNotes: "",
      doneDefinition: "",
      dependsOn: ""
    });

    const runId = startAgentRun({
      projectId: project.id,
      terminalSessionId: "session-interrupted",
      command: "powershell.exe",
      cwd: projectDirectory,
      taskId: task.id
    });
    setTaskStatus({ projectId: project.id, id: task.id, status: "running" });

    const reconciled = reconcileInterruptedRuns();
    expect(reconciled).toBe(1);

    const run = getAgentRun(runId);
    expect(run?.status).toBe("failed");
    expect(run?.errorMessage).toMatch(/interrupted/i);
    expect(run?.finishedAt).toBeTruthy();

    expect(getTaskById(task.id)?.status).toBe("ready");
  });

  it("does nothing when there are no interrupted runs", () => {
    const projectDirectory = join(databaseDirectory, "repo");
    mkdirSync(projectDirectory, { recursive: true });
    const { project } = openProjectFromPath(projectDirectory);

    const runId = startAgentRun({
      projectId: project.id,
      terminalSessionId: "session-done",
      command: "powershell.exe",
      cwd: projectDirectory
    });
    finishAgentRun(runId, "completed", 0);

    expect(reconcileInterruptedRuns()).toBe(0);
    expect(getAgentRun(runId)?.status).toBe("completed");
  });
});
