import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { detectProjectMetadata } from "./detectProjectMetadata.js";
import { isPathInsideRoot } from "./projectPaths.js";

const createTempProject = (): string => {
  const directory = join(tmpdir(), `agentdesk-project-${Date.now()}-${Math.random()}`);
  mkdirSync(directory, { recursive: true });
  return directory;
};

describe("detectProjectMetadata", () => {
  it("detects package.json scripts, package manager, git repo, and current branch", () => {
    const directory = createTempProject();

    try {
      writeFileSync(
        join(directory, "package.json"),
        JSON.stringify({
          scripts: {
            build: "vite build",
            lint: "eslint ."
          }
        })
      );
      writeFileSync(join(directory, "pnpm-lock.yaml"), "");
      mkdirSync(join(directory, ".git"));
      writeFileSync(join(directory, ".git", "HEAD"), "ref: refs/heads/feature/workspace\n");

      expect(detectProjectMetadata(directory)).toEqual({
        hasPackageJson: true,
        packageManager: "pnpm",
        scripts: [
          { name: "build", command: "vite build" },
          { name: "lint", command: "eslint ." }
        ],
        isGitRepo: true,
        currentBranch: "feature/workspace"
      });
    } finally {
      if (existsSync(directory)) {
        rmSync(directory, { recursive: true, force: true });
      }
    }
  });

  it("handles non-node, non-git folders safely", () => {
    const directory = createTempProject();

    try {
      expect(detectProjectMetadata(directory)).toEqual({
        hasPackageJson: false,
        packageManager: "unknown",
        scripts: [],
        isGitRepo: false,
        currentBranch: null
      });
    } finally {
      if (existsSync(directory)) {
        rmSync(directory, { recursive: true, force: true });
      }
    }
  });
});

describe("projectPaths", () => {
  it("accepts paths inside the project root and rejects sibling folders", () => {
    const root = createTempProject();
    const child = join(root, "packages", "app");
    const sibling = `${root}-sibling`;
    mkdirSync(child, { recursive: true });
    mkdirSync(sibling, { recursive: true });

    try {
      expect(isPathInsideRoot(root, child)).toBe(true);
      expect(isPathInsideRoot(root, root)).toBe(true);
      expect(isPathInsideRoot(root, sibling)).toBe(false);
    } finally {
      for (const directory of [root, sibling]) {
        if (existsSync(directory)) {
          rmSync(directory, { recursive: true, force: true });
        }
      }
    }
  });
});
