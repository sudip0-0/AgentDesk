import { z } from "zod";

export const projectIdRequestSchema = z.object({
  projectId: z.string().uuid()
});

export const parseProjectPayload = <T>(
  schema: z.ZodType<T>,
  payload: unknown
): { success: true; data: T } | { success: false; message: string } => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Invalid project request."
    };
  }

  return { success: true, data: result.data };
};
