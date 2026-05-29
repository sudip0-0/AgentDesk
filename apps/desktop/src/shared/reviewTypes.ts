import type { ReviewStatus } from "./reviewSummary.js";

/** A persisted review result linked to a run (and its task). */
export interface ReviewRecord {
  id: string;
  projectId: string;
  runId: string;
  taskId: string | null;
  status: ReviewStatus;
  risks: string[];
  recommendations: string[];
  changedFileCount: number;
  qualityPassed: number;
  qualityFailed: number;
  qualitySkipped: number;
  qualityBlocked: number;
  createdAt: string;
}

export interface SaveReviewInput {
  projectId: string;
  runId: string;
}

export interface ListReviewsInput {
  projectId: string;
  runId?: string;
}
