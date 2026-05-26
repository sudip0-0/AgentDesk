import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase } from "../db/client.js";
import { setDatabasePathForTests } from "../db/paths.js";
import { openProjectFromPath } from "../db/repositories/projectRepository.js";
import {
  commitGitChanges,
  getGitDiff,
  getGitStatus,
  stageGitFiles,
  toRepoRelativePath
} from "./gitRunner.js";

const hasGit = (): boolean => {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const resetDatabase = (): void => {
  closeDatabase();
  setDatabasePathForTests(null);
};

describe.runIf(hasGit())("gitRunner", () => {
  let databaseDirectory = "";
  let repoDirectory = "";

  beforeEach(() => {
    databaseDirectory = mkdtempSync(join(tmpdir(), "agentdesk-git-db-"));
    repoDirectory = mkdtempSync(join(tmpdir(), "agentdesk-git-repo-"));
    setDatabasePathForTests(join(databaseDirectory, "agentdesk.db"));

    execFileSync("git", ["init"], { cwd: repoDirectory });
    execFileSync("git", ["config", "user.email", "agentdesk@example.com"], { cwd: repoDirectory });
    execFileSync("git", ["config", "user.name", "AgentDesk"], { cwd: repoDirectory });
    writeFileSync(join(repoDirectory, "README.md"), "# AgentDesk\n");
    execFileSync("git", ["add", "README.md"], { cwd: repoDirectory });
    execFileSync("git", ["commit", "-m", "Initial commit"], { cwd: repoDirectory });
  });

  afterEach(() => {
    resetDatabase();
    rmSync(databaseDirectory, { recursive: true, force: true });
    rmSync(repoDirectory, { recursive: true, force: true });
  });

  it("reads git status for a repository project", async () => {
    const { project } = openProjectFromPath(repoDirectory);
    writeFileSync(join(repoDirectory, "tracked.ts"), "export const value = 1;\n");

    const status = await getGitStatus(project.id);

    expect(status.isGitRepo).toBe(true);
    expect(status.branch).toBeTruthy();
    expect(status.unstagedFiles.some((file) => file.path === "tracked.ts")).toBe(true);
  });

  it("shows untracked file diffs", async () => {
    const { project } = openProjectFromPath(repoDirectory);
    writeFileSync(join(repoDirectory, "new-file.ts"), "export const created = true;\n");

    const diff = await getGitDiff(project.id, "new-file.ts", false, "untracked");

    expect(diff.diff).toContain("created = true");
    expect(diff.message).toMatch(/untracked/i);
  });

  it("stages files and creates a commit", async () => {
    const { project } = openProjectFromPath(repoDirectory);
    writeFileSync(join(repoDirectory, "feature.ts"), "export const feature = true;\n");

    await stageGitFiles(project.id, ["feature.ts"]);
    const result = await commitGitChanges(project.id, "feat: add feature");

    expect(result.commitHash).toBeTruthy();
    const status = await getGitStatus(project.id);
    expect(status.files).toHaveLength(0);
  });

  it("rejects paths outside the project root", () => {
    expect(() => toRepoRelativePath(repoDirectory, "../outside.ts")).toThrow(/inside the project/i);
  });
});
