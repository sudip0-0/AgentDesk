import { z } from "zod";
import { defaultDocumentNames } from "../../shared/documentTypes.js";

export const documentProjectSchema = z.object({
  projectId: z.string().uuid()
});

const documentNameSchema = z.enum(defaultDocumentNames);

const documentPreviewFileSchema = z.object({
  name: documentNameSchema,
  path: z.string().min(1),
  content: z.string().max(1_000_000),
  exists: z.boolean()
});

export const documentsWriteSchema = z.object({
  projectId: z.string().uuid(),
  files: z.array(documentPreviewFileSchema).min(1).max(defaultDocumentNames.length)
});

export const parseDocumentPayload = <T>(
  schema: z.ZodType<T>,
  payload: unknown
): { success: true; data: T } | { success: false; message: string } => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Invalid document request."
    };
  }

  return { success: true, data: result.data };
};
