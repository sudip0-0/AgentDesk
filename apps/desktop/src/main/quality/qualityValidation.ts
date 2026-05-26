import { z } from "zod";

export const projectQualitySchema = z.object({
  projectId: z.string().uuid()
});

export const qualityCommandInputSchema = z.object({
  projectId: z.string().uuid(),
  label: z.string().trim().min(1, "Quality command label is required.").max(120),
  command: z.string().trim().min(1, "Quality command is required.").max(500),
  required: z.boolean(),
  timeoutMs: z.number().int().min(1_000).max(3_600_000).nullable()
});

export const qualityCommandUpdateSchema = qualityCommandInputSchema.extend({
  id: z.string().uuid()
});

export const qualityCommandDeleteSchema = z.object({
  projectId: z.string().uuid(),
  id: z.string().uuid()
});

export const runQualityChecksSchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  agentRunId: z.string().uuid().optional()
});

export const listQualityChecksSchema = runQualityChecksSchema;

export const createFixTaskSchema = z.object({
  projectId: z.string().uuid(),
  qualityCheckId: z.string().uuid()
});

export const parseQualityPayload = <T>(
  schema: z.ZodType<T>,
  payload: unknown
): { success: true; data: T } | { success: false; message: string } => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Invalid quality request."
    };
  }

  return { success: true, data: result.data };
};
