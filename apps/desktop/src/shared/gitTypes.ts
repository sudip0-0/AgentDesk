export type GitFileStatus = "staged" | "unstaged" | "staged_unstaged" | "untracked";

export interface GitChangedFile {
  path: string;
  indexStatus: string;
  workTreeStatus: string;
  status: GitFileStatus;
}

export interface GitStatusResult {
  isGitRepo: boolean;
  branch: string | null;
  files: GitChangedFile[];
  stagedFiles: GitChangedFile[];
  unstagedFiles: GitChangedFile[];
  message: string | null;
}

export interface GitDiffRequest {
  projectId: string;
  filePath: string;
  staged?: boolean;
  fileStatus?: GitFileStatus;
}

export interface GitDiffResult {
  filePath: string;
  staged: boolean;
  isBinary: boolean;
  truncated: boolean;
  diff: string;
  message: string | null;
}

export interface GitCreateBranchInput {
  projectId: string;
  branchName: string;
}

export interface GitStageFilesInput {
  projectId: string;
  filePaths: string[];
}

export interface GitCommitInput {
  projectId: string;
  message: string;
}

export interface GitCommitResult {
  commitHash: string | null;
  summary: string;
}
