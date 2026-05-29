import type { DefaultQualityCommand } from "./qualityDefaults.js";

/** Fallback defaults when the project has no package.json. */
export const qualityCommandDefaults: DefaultQualityCommand[] = [
  { label: "Lint", command: "npm run lint", required: true, timeoutMs: 120_000 },
  { label: "Typecheck", command: "npm run typecheck", required: true, timeoutMs: 120_000 },
  { label: "Test", command: "npm run test", required: true, timeoutMs: 120_000 },
  { label: "Build", command: "npm run build", required: true, timeoutMs: 180_000 }
];

export interface QualityRunContext {
  taskId?: string | null;
  agentRunId?: string | null;
  taskTitle?: string | null;
}

export type QualityCheckStatus = "passed" | "failed" | "skipped" | "blocked";

export interface QualityCommandRecord {
  id: string;
  projectId: string;
  label: string;
  command: string;
  required: boolean;
  timeoutMs: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QualityCommandInput {
  projectId: string;
  label: string;
  command: string;
  required: boolean;
  timeoutMs: number | null;
}

export interface QualityCommandUpdateInput extends QualityCommandInput {
  id: string;
}

export interface QualityCommandDeleteInput {
  projectId: string;
  id: string;
}

export interface RunQualityChecksInput {
  projectId: string;
  taskId?: string;
  agentRunId?: string;
}

export interface QualityCheckRecord {
  id: string;
  agentRunId: string | null;
  projectId: string;
  taskId: string | null;
  label: string;
  command: string;
  status: QualityCheckStatus;
  output: string;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface ListQualityChecksInput {
  projectId: string;
  taskId?: string;
  agentRunId?: string;
}

export interface CreateFixTaskInput {
  projectId: string;
  qualityCheckId: string;
}
