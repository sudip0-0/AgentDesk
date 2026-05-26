import { z } from "zod";

const gitFileStatusSchema = z.enum(["staged", "unstaged", "staged_unstaged", "untracked"]);

export const gitProjectSchema = z.object({
  projectId: z.string().uuid()
});

export const gitDiffSchema = gitProjectSchema.extend({
  filePath: z.string().trim().min(1, "File path is required.").max(1_000),
  staged: z.boolean().optional(),
  fileStatus: gitFileStatusSchema.optional()
});

export const gitCreateBranchSchema = gitProjectSchema.extend({
  branchName: z
    .string()
    .trim()
    .min(1, "Branch name is required.")
    .max(120)
    .regex(/^(?![/-])(?!.*\/\/)(?!.*\.\.)(?!.*@\{)(?!.*[~^:?*[\]\\\s])[\w./-]+(?<![/.])$/, {
      message: "Branch name contains unsupported characters."
    })
});

export const gitStageFilesSchema = gitProjectSchema.extend({
  filePaths: z
    .array(z.string().trim().min(1, "File path is required.").max(1_000))
    .min(1, "Select at least one file.")
    .max(100, "Stage at most 100 files at once.")
});

export const gitCommitSchema = gitProjectSchema.extend({
  message: z.string().trim().min(1, "Commit message is required.").max(10_000)
});

export const parseGitPayload = <T>(
  schema: z.ZodType<T>,
  payload: unknown
): { success: true; data: T } | { success: false; message: string } => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Invalid git request."
    };
  }

  return { success: true, data: result.data };
};
