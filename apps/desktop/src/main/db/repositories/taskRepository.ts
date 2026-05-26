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
import { tasks } from "../schema.js";

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
  createdAt: task.createdAt,
  updatedAt: task.updatedAt
});

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
    dependsOn: null,
    createdAt: now,
    updatedAt: now
  };

  database.insert(tasks).values(task).run();

  return toTaskRecord(task);
};

export const updateTask = (input: TaskUpdateInput): TaskRecord => {
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
      updatedAt
    })
    .where(eq(tasks.id, input.id))
    .run();

  const task = database.select().from(tasks).where(eq(tasks.id, input.id)).get();

  if (!task) {
    throw new Error("Task was not found.");
  }

  return toTaskRecord(task);
};

export const setTaskStatus = (input: TaskStatusUpdateInput): TaskRecord => {
  const database = getDatabase();

  database
    .update(tasks)
    .set({
      status: input.status,
      updatedAt: new Date().toISOString()
    })
    .where(eq(tasks.id, input.id))
    .run();

  const task = database.select().from(tasks).where(eq(tasks.id, input.id)).get();

  if (!task) {
    throw new Error("Task was not found.");
  }

  return toTaskRecord(task);
};

export const deleteTask = (taskId: string): void => {
  const database = getDatabase();
  database.delete(tasks).where(eq(tasks.id, taskId)).run();
};
