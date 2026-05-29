/**
 * Review engine (pure logic).
 *
 * Synthesizes a run's quality results, changed files, and process outcome into a
 * single pass/fail verdict with risks and recommended next actions. This is a
 * derived view: it reads data the run detail already loads and computes a
 * summary, so it needs no database or IPC of its own.
 */
import type { GitFileStatus } from "./gitTypes.js";
import type { QualityCheckStatus } from "./qualityTypes.js";

export type ReviewStatus = "passed" | "failed" | "warning";

export interface ReviewSummaryInput {
  /** Run lifecycle status: completed | failed | killed | running. */
  runStatus: string;
  exitCode: number | null;
  qualityResults: Array<{ label: string; status: QualityCheckStatus }>;
  changedFiles: Array<{ path: string; status: GitFileStatus }>;
}

export interface ReviewSummary {
  status: ReviewStatus;
  risks: string[];
  recommendations: string[];
  changedFileCount: number;
  qualityCounts: {
    passed: number;
    failed: number;
    skipped: number;
    blocked: number;
  };
}

/** Working trees larger than this are flagged as a large, hard-to-review diff. */
export const LARGE_DIFF_FILE_COUNT = 20;

const countByStatus = (
  results: Array<{ status: QualityCheckStatus }>
): ReviewSummary["qualityCounts"] => {
  const counts = { passed: 0, failed: 0, skipped: 0, blocked: 0 };

  for (const result of results) {
    counts[result.status] += 1;
  }

  return counts;
};

export const buildReviewSummary = (input: ReviewSummaryInput): ReviewSummary => {
  const qualityCounts = countByStatus(input.qualityResults);
  const changedFileCount = input.changedFiles.length;
  const deletedFiles = input.changedFiles.filter((file) => file.status === "unstaged" || file.status === "staged_unstaged");
  const risks: string[] = [];
  const recommendations: string[] = [];

  let status: ReviewStatus = "passed";
  const escalate = (next: ReviewStatus): void => {
    if (next === "failed") {
      status = "failed";
    } else if (next === "warning" && status !== "failed") {
      status = "warning";
    }
  };

  if (input.runStatus === "running") {
    escalate("warning");
    risks.push("The agent run has not finished yet.");
    recommendations.push("Wait for the run to finish or cancel it before reviewing.");
  }

  if (input.runStatus === "failed") {
    escalate("failed");
    risks.push(
      input.exitCode !== null && input.exitCode !== 0
        ? `The agent process exited with code ${input.exitCode}.`
        : "The agent run failed before completing."
    );
    recommendations.push("Open the transcript to find the failure, then create a fix task.");
  }

  if (input.runStatus === "killed") {
    escalate("warning");
    risks.push("The agent run was cancelled before it finished.");
    recommendations.push("Re-launch the task if the work is incomplete.");
  }

  const failedChecks = input.qualityResults.filter((result) => result.status === "failed");
  if (failedChecks.length > 0) {
    escalate("failed");
    risks.push(`${failedChecks.length} required quality check(s) failed: ${failedChecks.map((check) => check.label).join(", ")}.`);
    recommendations.push("Create a fix task from the failed checks and re-run quality gates.");
  }

  const blockedChecks = input.qualityResults.filter((result) => result.status === "blocked");
  if (blockedChecks.length > 0) {
    escalate("failed");
    risks.push(`${blockedChecks.length} quality command(s) were blocked for safety and did not run.`);
    recommendations.push("Review the blocked commands and replace any destructive operations.");
  }

  const skippedChecks = input.qualityResults.filter((result) => result.status === "skipped");
  if (skippedChecks.length > 0) {
    escalate("warning");
    risks.push(`${skippedChecks.length} optional check(s) were skipped or failed without blocking the run.`);
  }

  if (input.qualityResults.length === 0 && input.runStatus !== "running") {
    escalate("warning");
    risks.push("No quality checks were run for this work.");
    recommendations.push("Run lint, typecheck, test, and build before marking the task done.");
  }

  if (changedFileCount === 0 && input.runStatus === "completed") {
    escalate("warning");
    risks.push("The agent run completed but the working tree shows no changed files.");
    recommendations.push("Confirm the agent actually made the intended changes.");
  }

  if (changedFileCount > LARGE_DIFF_FILE_COUNT) {
    escalate("warning");
    risks.push(`Large change set: ${changedFileCount} files changed. Review carefully for unrelated edits.`);
    recommendations.push("Inspect the git diff for files outside the task scope.");
  }

  if (deletedFiles.length > 0 && changedFileCount > 0) {
    recommendations.push("Verify file deletions and modifications in the git diff before committing.");
  }

  if (risks.length === 0) {
    recommendations.push("Review the git diff, then commit and mark the task done.");
  }

  return {
    status,
    risks,
    recommendations,
    changedFileCount,
    qualityCounts
  };
};
