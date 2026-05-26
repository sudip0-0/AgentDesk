import { describe, expect, it } from "vitest";
import {
  branchNameFromTaskTitle,
  buildGeneratedCommitMessage,
  parseGitPorcelainStatus
} from "./gitHelpers.js";

describe("git helpers", () => {
  it("parses staged, unstaged, mixed, and untracked porcelain status", () => {
    expect(parseGitPorcelainStatus("M  staged.ts\n M unstaged.ts\nMM mixed.ts\n?? new file.ts\n")).toEqual([
      {
        path: "staged.ts",
        indexStatus: "M",
        workTreeStatus: " ",
        status: "staged"
      },
      {
        path: "unstaged.ts",
        indexStatus: " ",
        workTreeStatus: "M",
        status: "unstaged"
      },
      {
        path: "mixed.ts",
        indexStatus: "M",
        workTreeStatus: "M",
        status: "staged_unstaged"
      },
      {
        path: "new file.ts",
        indexStatus: "?",
        workTreeStatus: "?",
        status: "untracked"
      }
    ]);
  });

  it("creates a task branch name from a task title", () => {
    expect(branchNameFromTaskTitle("TASK-0803: Create Branch and Commit!")).toBe(
      "task/task-0803-create-branch-and-commit"
    );
  });

  it("builds an editable generated commit message", () => {
    expect(
      buildGeneratedCommitMessage("Show git status", [
        { path: "one.ts", indexStatus: "M", workTreeStatus: " ", status: "staged" }
      ])
    ).toContain("Show git status");
  });
});
