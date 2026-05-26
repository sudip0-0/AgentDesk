import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import type {
  TaskInput,
  TaskRecord,
  TaskStatus,
  TaskStatusUpdateInput,
  TaskUpdateInput
} from "../../../shared/taskTypes.js";
import { getDatabase } from "../client.js";
import { agentRuns, qualityChecks, tasks } from "../schema.js";

const cleanText = (value: string | null): string => value ?? "";

const toTaskRecord = (task: typeof tasks.$inferSelect): TaskRecord => ({
  id: task.id,
  projectId: task.projectId,
  title: task.title,
  description: cleanText(task.description),
  status: task.status as TaskStatus,
  priority: task.priority === "high" || task.priority === "low" ? task.priority : "medium",
  goal: cleanText(task.goal),
  context: cleanText(task.context),
  acceptanceCriteria: cleanText(task.acceptanceCriteria),
  filesLikelyAffected: cleanText(task.filesLikelyAffected),
  qualityCommands: cleanText(task.qualityCommands),
  securityNotes: cleanText(task.securityNotes),
  doneDefinition: cleanText(task.doneDefinition),
  dependsOn: cleanText(task.dependsOn),
  createdAt: task.createdAt,
  updatedAt: task.updatedAt
});

export const getTaskById = (taskId: string): TaskRecord | null => {
  const database = getDatabase();
  const task = database.select().from(tasks).where(eq(tasks.id, taskId)).get();

  return task ? toTaskRecord(task) : null;
};

export const assertTaskBelongsToProject = (taskId: string, projectId: string): void => {
  const task = getTaskById(taskId);

  if (!task || task.projectId !== projectId) {
    throw new Error("Task was not found for this project.");
  }
};

export const listTasks = (projectId: string): TaskRecord[] => {
  const database = getDatabase();

  return database
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.createdAt))
    .all()
    .map(toTaskRecord);
};

export const createTask = (input: TaskInput): TaskRecord => {
  const database = getDatabase();
  const now = new Date().toISOString();
  const task = {
    id: randomUUID(),
    projectId: input.projectId,
    title: input.title.trim(),
    description: input.description,
    status: input.status,
    priority: input.priority,
    goal: input.goal,
    context: input.context,
    acceptanceCriteria: input.acceptanceCriteria,
    filesLikelyAffected: input.filesLikelyAffected,
    qualityCommands: input.qualityCommands,
    securityNotes: input.securityNotes,
    doneDefinition: input.doneDefinition,
    dependsOn: input.dependsOn,
    createdAt: now,
    updatedAt: now
  };

  database.insert(tasks).values(task).run();

  return toTaskRecord(task);
};

export const updateTask = (input: TaskUpdateInput): TaskRecord => {
  assertTaskBelongsToProject(input.id, input.projectId);

  const database = getDatabase();
  const updatedAt = new Date().toISOString();

  database
    .update(tasks)
    .set({
      title: input.title.trim(),
      description: input.description,
      status: input.status,
      priority: input.priority,
      goal: input.goal,
      context: input.context,
      acceptanceCriteria: input.acceptanceCriteria,
      filesLikelyAffected: input.filesLikelyAffected,
      qualityCommands: input.qualityCommands,
      securityNotes: input.securityNotes,
      doneDefinition: input.doneDefinition,
      dependsOn: input.dependsOn,
      updatedAt
    })
    .where(eq(tasks.id, input.id))
    .run();

  const task = getTaskById(input.id);

  if (!task) {
    throw new Error("Task was not found.");
  }

  return task;
};

export const setTaskStatus = (input: TaskStatusUpdateInput): TaskRecord => {
  assertTaskBelongsToProject(input.id, input.projectId);

  const database = getDatabase();

  database
    .update(tasks)
    .set({
      status: input.status,
      updatedAt: new Date().toISOString()
    })
    .where(eq(tasks.id, input.id))
    .run();

  const task = getTaskById(input.id);

  if (!task) {
    throw new Error("Task was not found.");
  }

  return task;
};

export const deleteTask = (taskId: string, projectId: string): void => {
  assertTaskBelongsToProject(taskId, projectId);

  const database = getDatabase();

  database.update(agentRuns).set({ taskId: null }).where(eq(agentRuns.taskId, taskId)).run();
  database.update(qualityChecks).set({ taskId: null }).where(eq(qualityChecks.taskId, taskId)).run();

  const result = database.delete(tasks).where(eq(tasks.id, taskId)).run();

  if (result.changes === 0) {
    throw new Error("Task was not found.");
  }
};
