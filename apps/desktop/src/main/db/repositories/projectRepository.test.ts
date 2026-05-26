import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase } from "../client.js";
import { setDatabasePathForTests } from "../paths.js";
import { getProjectById, listProjects, openProjectFromPath } from "./projectRepository.js";

const resetDatabase = (): void => {
  closeDatabase();
  setDatabasePathForTests(null);
};

describe("projectRepository", () => {
  let databaseDirectory = "";

  beforeEach(() => {
    databaseDirectory = join(tmpdir(), `agentdesk-project-repo-${Date.now()}`);
    mkdirSync(databaseDirectory, { recursive: true });
    setDatabasePathForTests(join(databaseDirectory, "agentdesk.db"));
  });

  afterEach(() => {
    resetDatabase();
    rmSync(databaseDirectory, { recursive: true, force: true });
  });

  it("opens a new project and prevents duplicate paths", () => {
    const projectDirectory = join(databaseDirectory, "sample-project");
    mkdirSync(projectDirectory, { recursive: true });
    writeFileSync(join(projectDirectory, "package.json"), JSON.stringify({ name: "sample" }));

    const first = openProjectFromPath(projectDirectory);
    const second = openProjectFromPath(projectDirectory);

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.project.id).toBe(first.project.id);
    expect(listProjects()).toHaveLength(1);
    expect(getProjectById(first.project.id)?.path).toBe(second.project.path);
  });

  it("rejects missing folders", () => {
    expect(() => openProjectFromPath(join(databaseDirectory, "missing-folder"))).toThrow(
      /does not exist/i
    );
  });
});
