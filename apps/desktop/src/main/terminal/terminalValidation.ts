import { z } from "zod";

const terminalSizeSchema = z.number().int().min(1).max(500);

export const createTerminalRequestSchema = z.object({
  projectId: z.string().uuid(),
  cwd: z.string().max(4096).optional(),
  cols: terminalSizeSchema.optional(),
  rows: terminalSizeSchema.optional(),
  shell: z.enum(["powershell", "cmd"]).optional()
});

export const terminalWriteRequestSchema = z.object({
  id: z.string().uuid(),
  data: z.string().max(65_536)
});

export const terminalResizeRequestSchema = z.object({
  id: z.string().uuid(),
  cols: terminalSizeSchema,
  rows: terminalSizeSchema
});

export const terminalKillRequestSchema = z.object({
  id: z.string().uuid()
});

export const parseIpcPayload = <T>(
  schema: z.ZodType<T>,
  payload: unknown
): { success: true; data: T } | { success: false; message: string } => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid terminal request.";
    return { success: false, message };
  }

  return { success: true, data: result.data };
};
