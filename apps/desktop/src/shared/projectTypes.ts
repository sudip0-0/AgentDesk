import type { TaskStatus } from "./taskTypes.js";

export type { TaskStatus };

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "unknown";

export interface ProjectScript {
  name: string;
  command: string;
}

export interface ProjectMetadata {
  hasPackageJson: boolean;
  packageManager: PackageManager;
  scripts: ProjectScript[];
  isGitRepo: boolean;
  currentBranch: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  metadata: ProjectMetadata;
}

export interface OpenProjectResult {
  project: ProjectSummary;
  duplicate: boolean;
}

export interface TaskStatusSummary {
  backlog: number;
  ready: number;
  running: number;
  needs_review: number;
  failed: number;
  blocked: number;
  done: number;
  total: number;
}

export interface AgentRunSummary {
  id: string;
  command: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  summary: string | null;
  taskId: string | null;
  taskTitle: string | null;
}

export interface NextTaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
}

export interface ProjectOverview {
  project: ProjectSummary;
  taskSummary: TaskStatusSummary;
  recentRuns: AgentRunSummary[];
  nextTask: NextTaskSummary | null;
}
