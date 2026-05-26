export const taskStatuses = [
  "backlog",
  "ready",
  "running",
  "needs_review",
  "failed",
  "blocked",
  "done"
] as const;

export type TaskStatus = (typeof taskStatuses)[number];

export const taskPriorities = ["low", "medium", "high"] as const;

export type TaskPriority = (typeof taskPriorities)[number];

export interface TaskRecord {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  goal: string;
  context: string;
  acceptanceCriteria: string;
  filesLikelyAffected: string;
  qualityCommands: string;
  securityNotes: string;
  doneDefinition: string;
  dependsOn: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  goal: string;
  context: string;
  acceptanceCriteria: string;
  filesLikelyAffected: string;
  qualityCommands: string;
  securityNotes: string;
  doneDefinition: string;
  dependsOn: string;
}

export interface TaskUpdateInput extends TaskInput {
  id: string;
}

export interface TaskStatusUpdateInput {
  projectId: string;
  id: string;
  status: TaskStatus;
}

export interface TaskDeleteInput {
  projectId: string;
  id: string;
}
