import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase } from "../client.js";
import { setDatabasePathForTests } from "../paths.js";
import { openProjectFromPath } from "./projectRepository.js";
import { getProjectOverview } from "./projectOverviewRepository.js";
import { getDatabase } from "../client.js";
import { tasks } from "../schema.js";

const resetDatabase = (): void => {
  closeDatabase();
  setDatabasePathForTests(null);
};

describe("projectOverviewRepository", () => {
  let databaseDirectory = "";

  beforeEach(() => {
    databaseDirectory = join(tmpdir(), `agentdesk-overview-${Date.now()}`);
    mkdirSync(databaseDirectory, { recursive: true });
    setDatabasePathForTests(join(databaseDirectory, "agentdesk.db"));
  });

  afterEach(() => {
    resetDatabase();
    rmSync(databaseDirectory, { recursive: true, force: true });
  });

  it("returns task summary, next task, and recent runs for a project", () => {
    const projectDirectory = join(databaseDirectory, "overview-project");
    mkdirSync(projectDirectory, { recursive: true });
    writeFileSync(join(projectDirectory, "package.json"), JSON.stringify({ name: "overview" }));

    const { project } = openProjectFromPath(projectDirectory);
    const database = getDatabase();
    const now = new Date().toISOString();

    database
      .insert(tasks)
      .values([
        {
          id: "task-ready",
          projectId: project.id,
          title: "Ready task",
          status: "ready",
          createdAt: now,
          updatedAt: now
        },
        {
          id: "task-done",
          projectId: project.id,
          title: "Done task",
          status: "done",
          createdAt: now,
          updatedAt: now
        }
      ])
      .run();

    const overview = getProjectOverview(project.id);

    expect(overview.project.metadata.hasPackageJson).toBe(true);
    expect(overview.taskSummary.total).toBe(2);
    expect(overview.taskSummary.ready).toBe(1);
    expect(overview.nextTask?.id).toBe("task-ready");
  });
});
