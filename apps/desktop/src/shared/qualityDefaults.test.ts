import { describe, expect, it } from "vitest";
import { buildDefaultQualityCommandsFromMetadata } from "./qualityDefaults.js";
import type { ProjectMetadata } from "./projectTypes.js";

const baseMetadata = (scripts: ProjectMetadata["scripts"]): ProjectMetadata => ({
  hasPackageJson: true,
  packageManager: "npm",
  scripts,
  isGitRepo: false,
  currentBranch: null
});

describe("qualityDefaults", () => {
  it("builds npm run commands only for scripts that exist", () => {
    const defaults = buildDefaultQualityCommandsFromMetadata(
      baseMetadata([
        { name: "lint", command: "eslint ." },
        { name: "test", command: "vitest run" }
      ])
    );

    expect(defaults).toHaveLength(2);
    expect(defaults.map((entry) => entry.command)).toEqual(["npm run lint", "npm run test"]);
  });

  it("uses pnpm when the project package manager is pnpm", () => {
    const defaults = buildDefaultQualityCommandsFromMetadata({
      ...baseMetadata([{ name: "build", command: "vite build" }]),
      packageManager: "pnpm"
    });

    expect(defaults).toEqual([
      expect.objectContaining({ label: "Build", command: "pnpm run build" })
    ]);
  });

  it("returns no defaults when package.json is missing", () => {
    expect(
      buildDefaultQualityCommandsFromMetadata({
        hasPackageJson: false,
        packageManager: "unknown",
        scripts: [],
        isGitRepo: false,
        currentBranch: null
      })
    ).toEqual([]);
  });
});
