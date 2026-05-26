import { z } from "zod";

export const runProjectSchema = z.object({
  projectId: z.string().uuid()
});

export const runDetailSchema = runProjectSchema.extend({
  runId: z.string().uuid()
});

export const parseRunPayload = <T>(
  schema: z.ZodType<T>,
  payload: unknown
): { success: true; data: T } | { success: false; message: string } => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Invalid run request."
    };
  }

  return { success: true, data: result.data };
};
