import { describe, expect, it } from "vitest";
import {
  gitCommitSchema,
  gitCreateBranchSchema,
  gitDiffSchema,
  gitProjectSchema,
  gitStageFilesSchema,
  parseGitPayload
} from "./gitValidation.js";

describe("gitValidation", () => {
  it("requires a project id", () => {
    const result = parseGitPayload(gitProjectSchema, {});

    expect(result.success).toBe(false);
  });

  it("accepts diff requests with file status", () => {
    const result = parseGitPayload(gitDiffSchema, {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      filePath: "src/app.ts",
      staged: true,
      fileStatus: "staged_unstaged"
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid branch names", () => {
    const result = parseGitPayload(gitCreateBranchSchema, {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      branchName: "bad branch name"
    });

    expect(result.success).toBe(false);
  });

  it("limits staged file batches", () => {
    const result = parseGitPayload(gitStageFilesSchema, {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      filePaths: Array.from({ length: 101 }, (_, index) => `file-${index}.ts`)
    });

    expect(result.success).toBe(false);
  });

  it("accepts commit payloads", () => {
    const result = parseGitPayload(gitCommitSchema, {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      message: "feat: add git panel"
    });

    expect(result.success).toBe(true);
  });
});
