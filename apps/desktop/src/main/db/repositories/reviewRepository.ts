import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { ListReviewsInput, ReviewRecord, SaveReviewInput } from "../../../shared/reviewTypes.js";
import { buildReviewSummary } from "../../../shared/reviewSummary.js";
import type { ReviewStatus } from "../../../shared/reviewSummary.js";
import type { QualityCheckStatus } from "../../../shared/qualityTypes.js";
import type { GitFileStatus } from "../../../shared/gitTypes.js";
import { getGitStatus } from "../../git/gitRunner.js";
import { getDatabase } from "../client.js";
import { agentRuns, qualityChecks, reviews } from "../schema.js";
import { getProjectById } from "./projectRepository.js";

const parseStringArray = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
};

const toReviewRecord = (review: typeof reviews.$inferSelect): ReviewRecord => ({
  id: review.id,
  projectId: review.projectId,
  runId: review.runId,
  taskId: review.taskId,
  status: review.status as ReviewStatus,
  risks: parseStringArray(review.risks),
  recommendations: parseStringArray(review.recommendations),
  changedFileCount: review.changedFileCount,
  qualityPassed: review.qualityPassed,
  qualityFailed: review.qualityFailed,
  qualitySkipped: review.qualitySkipped,
  qualityBlocked: review.qualityBlocked,
  createdAt: review.createdAt
});

/**
 * Computes a review summary from the run's stored quality results and current
 * git changed files, then persists it as a review record linked to the run.
 */
export const saveReviewForRun = async (input: SaveReviewInput): Promise<ReviewRecord> => {
  if (!getProjectById(input.projectId)) {
    throw new Error("Project was not found.");
  }

  const database = getDatabase();
  const run = database.select().from(agentRuns).where(eq(agentRuns.id, input.runId)).get();

  if (!run || run.projectId !== input.projectId) {
    throw new Error("Agent run was not found for this project.");
  }

  const qualityResults = database
    .select({ label: qualityChecks.label, status: qualityChecks.status })
    .from(qualityChecks)
    .where(eq(qualityChecks.agentRunId, input.runId))
    .all()
    .map((check) => ({ label: check.label, status: check.status as QualityCheckStatus }));

  const gitStatus = await getGitStatus(input.projectId).catch(() => ({ files: [] as Array<{ path: string; status: GitFileStatus }> }));

  const summary = buildReviewSummary({
    runStatus: run.status,
    exitCode: run.exitCode,
    qualityResults,
    changedFiles: gitStatus.files.map((file) => ({ path: file.path, status: file.status }))
  });

  const record = {
    id: randomUUID(),
    projectId: input.projectId,
    runId: input.runId,
    taskId: run.taskId ?? null,
    status: summary.status,
    risks: JSON.stringify(summary.risks),
    recommendations: JSON.stringify(summary.recommendations),
    changedFileCount: summary.changedFileCount,
    qualityPassed: summary.qualityCounts.passed,
    qualityFailed: summary.qualityCounts.failed,
    qualitySkipped: summary.qualityCounts.skipped,
    qualityBlocked: summary.qualityCounts.blocked,
    createdAt: new Date().toISOString()
  };

  database.insert(reviews).values(record).run();

  return toReviewRecord(record);
};

export const listReviews = (input: ListReviewsInput): ReviewRecord[] => {
  const database = getDatabase();
  const filters = [eq(reviews.projectId, input.projectId)];

  if (input.runId) {
    filters.push(eq(reviews.runId, input.runId));
  }

  return database
    .select()
    .from(reviews)
    .where(and(...filters))
    .orderBy(desc(reviews.createdAt))
    .limit(50)
    .all()
    .map(toReviewRecord);
};
