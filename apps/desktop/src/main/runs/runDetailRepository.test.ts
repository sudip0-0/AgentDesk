import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase } from "../db/client.js";
import { setDatabasePathForTests } from "../db/paths.js";
import { startAgentRun } from "../db/repositories/agentRunRepository.js";
import { openProjectFromPath } from "../db/repositories/projectRepository.js";
import { getAgentRunDetail, listAgentRuns } from "./runDetailRepository.js";

const resetDatabase = (): void => {
  closeDatabase();
  setDatabasePathForTests(null);
};

describe("runDetailRepository", () => {
  let databaseDirectory = "";
  let projectDirectory = "";

  beforeEach(() => {
    databaseDirectory = mkdtempSync(join(tmpdir(), "agentdesk-run-detail-db-"));
    projectDirectory = mkdtempSync(join(tmpdir(), "agentdesk-run-detail-project-"));
    setDatabasePathForTests(join(databaseDirectory, "agentdesk.db"));
    mkdirSync(projectDirectory, { recursive: true });
  });

  afterEach(() => {
    resetDatabase();
    rmSync(databaseDirectory, { recursive: true, force: true });
    rmSync(projectDirectory, { recursive: true, force: true });
  });

  it("lists runs for the selected project", async () => {
    const { project } = openProjectFromPath(projectDirectory);
    const runId = startAgentRun({
      projectId: project.id,
      terminalSessionId: "session-1",
      command: "powershell.exe",
      cwd: projectDirectory,
      prompt: "Implement the selected task."
    });

    const runs = listAgentRuns(project.id);

    expect(runs).toHaveLength(1);
    expect(runs[0]?.id).toBe(runId);
    expect(runs[0]?.command).toBe("powershell.exe");
  });

  it("returns run detail with prompt and transcript metadata", async () => {
    const { project } = openProjectFromPath(projectDirectory);
    const runId = startAgentRun({
      projectId: project.id,
      terminalSessionId: "session-2",
      command: "codex",
      cwd: projectDirectory,
      prompt: "Review the task contract."
    });

    const detail = await getAgentRunDetail(project.id, runId);

    expect(detail.prompt).toBe("Review the task contract.");
    expect(detail.command).toBe("codex");
    expect(detail.logMeta.chunkCount).toBeGreaterThanOrEqual(0);
  });

  it("rejects runs outside the selected project", async () => {
    const { project: firstProject } = openProjectFromPath(projectDirectory);
    const otherDirectory = join(databaseDirectory, "other-repo");
    mkdirSync(otherDirectory, { recursive: true });
    const { project: otherProject } = openProjectFromPath(otherDirectory);
    const runId = startAgentRun({
      projectId: firstProject.id,
      terminalSessionId: "session-3",
      command: "powershell.exe",
      cwd: projectDirectory
    });

    await expect(getAgentRunDetail(otherProject.id, runId)).rejects.toThrow(
      /not found for this project/i
    );
  });
});
