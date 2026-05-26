import { ipcMain } from "electron";
import {
  commitGitChanges,
  createGitBranch,
  getGitDiff,
  getGitStatus,
  stageGitFiles
} from "./gitRunner.js";
import {
  gitCommitSchema,
  gitCreateBranchSchema,
  gitDiffSchema,
  gitProjectSchema,
  gitStageFilesSchema,
  parseGitPayload
} from "./gitValidation.js";

export const registerGitIpc = (): void => {
  ipcMain.handle("git:status", (_event, payload: unknown) => {
    const parsed = parseGitPayload(gitProjectSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return getGitStatus(parsed.data.projectId);
  });

  ipcMain.handle("git:diff", (_event, payload: unknown) => {
    const parsed = parseGitPayload(gitDiffSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return getGitDiff(
      parsed.data.projectId,
      parsed.data.filePath,
      parsed.data.staged ?? false,
      parsed.data.fileStatus
    );
  });

  ipcMain.handle("git:create-branch", (_event, payload: unknown) => {
    const parsed = parseGitPayload(gitCreateBranchSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return createGitBranch(parsed.data.projectId, parsed.data.branchName);
  });

  ipcMain.handle("git:stage-files", (_event, payload: unknown) => {
    const parsed = parseGitPayload(gitStageFilesSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return stageGitFiles(parsed.data.projectId, parsed.data.filePaths);
  });

  ipcMain.handle("git:commit", (_event, payload: unknown) => {
    const parsed = parseGitPayload(gitCommitSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    return commitGitChanges(parsed.data.projectId, parsed.data.message);
  });
};
