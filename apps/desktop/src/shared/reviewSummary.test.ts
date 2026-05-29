import { describe, expect, it } from "vitest";
import { buildReviewSummary, LARGE_DIFF_FILE_COUNT } from "./reviewSummary.js";
import type { ReviewSummaryInput } from "./reviewSummary.js";

const baseInput = (overrides: Partial<ReviewSummaryInput> = {}): ReviewSummaryInput => ({
  runStatus: "completed",
  exitCode: 0,
  qualityResults: [{ label: "Lint", status: "passed" }],
  changedFiles: [{ path: "src/a.ts", status: "unstaged" }],
  ...overrides
});

describe("buildReviewSummary", () => {
  it("passes a clean completed run with passing checks and changes", () => {
    const summary = buildReviewSummary(baseInput());

    expect(summary.status).toBe("passed");
    expect(summary.risks).toEqual([]);
    expect(summary.recommendations.length).toBeGreaterThan(0);
    expect(summary.qualityCounts.passed).toBe(1);
  });

  it("fails when a required quality check failed", () => {
    const summary = buildReviewSummary(
      baseInput({
        qualityResults: [
          { label: "Lint", status: "passed" },
          { label: "Test", status: "failed" }
        ]
      })
    );

    expect(summary.status).toBe("failed");
    expect(summary.risks.join(" ")).toContain("Test");
    expect(summary.recommendations.join(" ")).toMatch(/fix task/i);
  });

  it("fails when the run process failed", () => {
    const summary = buildReviewSummary(
      baseInput({ runStatus: "failed", exitCode: 1 })
    );

    expect(summary.status).toBe("failed");
    expect(summary.risks.join(" ")).toContain("exited with code 1");
  });

  it("fails when a command was blocked for safety", () => {
    const summary = buildReviewSummary(
      baseInput({
        qualityResults: [{ label: "Danger", status: "blocked" }]
      })
    );

    expect(summary.status).toBe("failed");
    expect(summary.qualityCounts.blocked).toBe(1);
    expect(summary.risks.join(" ")).toMatch(/blocked for safety/i);
  });

  it("warns when a completed run produced no changed files", () => {
    const summary = buildReviewSummary(baseInput({ changedFiles: [] }));

    expect(summary.status).toBe("warning");
    expect(summary.risks.join(" ")).toMatch(/no changed files/i);
  });

  it("warns when no quality checks were run", () => {
    const summary = buildReviewSummary(baseInput({ qualityResults: [] }));

    expect(summary.status).toBe("warning");
    expect(summary.risks.join(" ")).toMatch(/no quality checks/i);
  });

  it("warns on a large change set", () => {
    const changedFiles = Array.from({ length: LARGE_DIFF_FILE_COUNT + 1 }, (_unused, index) => ({
      path: `src/file-${index}.ts`,
      status: "unstaged" as const
    }));

    const summary = buildReviewSummary(baseInput({ changedFiles }));

    expect(summary.status).toBe("warning");
    expect(summary.risks.join(" ")).toMatch(/large change set/i);
  });

  it("warns when the run is still running", () => {
    const summary = buildReviewSummary(baseInput({ runStatus: "running" }));

    expect(summary.status).toBe("warning");
    expect(summary.risks.join(" ")).toMatch(/not finished/i);
  });

  it("warns when the run was cancelled", () => {
    const summary = buildReviewSummary(baseInput({ runStatus: "killed" }));

    expect(summary.status).toBe("warning");
    expect(summary.risks.join(" ")).toMatch(/cancelled/i);
  });

  it("prioritizes failed over warning", () => {
    const summary = buildReviewSummary(
      baseInput({
        runStatus: "completed",
        qualityResults: [
          { label: "Test", status: "failed" },
          { label: "Optional", status: "skipped" }
        ],
        changedFiles: []
      })
    );

    expect(summary.status).toBe("failed");
  });
});
