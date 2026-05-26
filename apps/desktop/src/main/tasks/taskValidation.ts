import { z } from "zod";
import { taskPriorities, taskStatuses } from "../../shared/taskTypes.js";

export const projectTaskListSchema = z.object({
  projectId: z.string().uuid()
});

export const taskInputSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().trim().min(1, "Task title is required.").max(160),
  description: z.string().max(4000),
  status: z.enum(taskStatuses),
  priority: z.enum(taskPriorities),
  goal: z.string().max(4000),
  context: z.string().max(4000),
  acceptanceCriteria: z.string().max(4000),
  filesLikelyAffected: z.string().max(4000),
  qualityCommands: z.string().max(4000),
  securityNotes: z.string().max(4000),
  doneDefinition: z.string().max(4000)
});

export const taskUpdateSchema = taskInputSchema.omit({ projectId: true }).extend({
  id: z.string().uuid()
});

export const taskStatusUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(taskStatuses)
});

export const taskDeleteSchema = z.object({
  id: z.string().uuid()
});

export const parseTaskPayload = <T>(
  schema: z.ZodType<T>,
  payload: unknown
): { success: true; data: T } | { success: false; message: string } => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Invalid task request."
    };
  }

  return { success: true, data: result.data };
};
