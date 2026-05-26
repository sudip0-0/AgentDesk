import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import type {
  GitCommitResult,
  GitDiffResult,
  GitFileStatus,
  GitStatusResult
} from "../../shared/gitTypes.js";
import { parseGitPorcelainStatus } from "../../shared/gitHelpers.js";
import { getProjectById } from "../db/repositories/projectRepository.js";
import { redactSecrets } from "../terminal/logRedaction.js";

const MAX_DIFF_LENGTH = 200_000;

let gitAvailabilityChecked = false;

const runGit = async (
  cwd: string,
  args: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> =>
  new Promise((resolvePromise) => {
    const child = spawn("git", args, {
      cwd,
      shell: false,
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      resolvePromise({
        stdout,
        stderr: error.message,
        exitCode: null
      });
    });

    child.on("close", (exitCode) => {
      resolvePromise({ stdout, stderr, exitCode });
    });
  });

const ensureGitInstalled = async (): Promise<void> => {
  if (gitAvailabilityChecked) {
    return;
  }

  const result = await runGit(process.cwd(), ["--version"]);

  if (result.exitCode !== 0) {
    const hint =
      /enoent|not found|spawn/i.test(result.stderr)
        ? " Install Git for Windows and ensure git.exe is on your PATH."
        : "";

    throw new Error(`Git is not available on this system.${hint}`);
  }

  gitAvailabilityChecked = true;
};

const getProjectPath = (projectId: string): string => {
  const project = getProjectById(projectId);

  if (!project) {
    throw new Error("Project was not found.");
  }

  return project.path;
};

export const toRepoRelativePath = (projectPath: string, filePath: string): string => {
  const normalizedPath = resolve(projectPath, filePath);
  const relativePath = relative(projectPath, normalizedPath);

  if (relativePath === "" || relativePath.startsWith("..") || resolve(projectPath, relativePath) !== normalizedPath) {
    throw new Error("File must be inside the project folder.");
  }

  return relativePath.replace(/\\/g, "/");
};

const ensureRepo = async (projectPath: string): Promise<boolean> => {
  const result = await runGit(projectPath, ["rev-parse", "--is-inside-work-tree"]);

  return result.exitCode === 0 && result.stdout.trim() === "true";
};

const formatDiffResult = (
  relativePath: string,
  staged: boolean,
  stdout: string
): GitDiffResult => {
  const isBinary = /^Binary files .+ differ$/m.test(stdout);
  const redacted = redactSecrets(stdout);
  const truncated = redacted.length > MAX_DIFF_LENGTH;
  const diff = truncated ? redacted.slice(0, MAX_DIFF_LENGTH) : redacted;

  return {
    filePath: relativePath,
    staged,
    isBinary,
    truncated,
    diff: isBinary ? "" : diff,
    message: isBinary
      ? "Binary file diffs are not supported."
      : truncated
        ? `Diff truncated at ${MAX_DIFF_LENGTH} characters.`
        : redacted.trim()
          ? null
          : staged
            ? "No staged diff for this file."
            : "No unstaged diff for this file."
  };
};

const readUntrackedDiff = async (projectPath: string, relativePath: string): Promise<string> => {
  const absolutePath = resolve(projectPath, relativePath);

  if (!existsSync(absolutePath)) {
    throw new Error("Untracked file was not found on disk.");
  }

  const nullPath = process.platform === "win32" ? "NUL" : "/dev/null";
  const result = await runGit(projectPath, ["diff", "--no-index", "--", nullPath, absolutePath]);

  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new Error(result.stderr || "Failed to read untracked file diff.");
  }

  return result.stdout;
};

export const getGitStatus = async (projectId: string): Promise<GitStatusResult> => {
  await ensureGitInstalled();
  const projectPath = getProjectPath(projectId);
  const isGitRepo = await ensureRepo(projectPath);

  if (!isGitRepo) {
    return {
      isGitRepo: false,
      branch: null,
      files: [],
      stagedFiles: [],
      unstagedFiles: [],
      message: "This folder is not a git repository."
    };
  }

  const [branchResult, statusResult] = await Promise.all([
    runGit(projectPath, ["branch", "--show-current"]),
    runGit(projectPath, ["status", "--porcelain"])
  ]);

  if (statusResult.exitCode !== 0) {
    throw new Error(statusResult.stderr || "Failed to read git status.");
  }

  const files = parseGitPorcelainStatus(statusResult.stdout);
  const stagedFiles = files.filter((file) => file.status === "staged" || file.status === "staged_unstaged");
  const unstagedFiles = files.filter(
    (file) =>
      file.status === "unstaged" || file.status === "staged_unstaged" || file.status === "untracked"
  );

  return {
    isGitRepo: true,
    branch: branchResult.stdout.trim() || "HEAD detached",
    files,
    stagedFiles,
    unstagedFiles,
    message: files.length === 0 ? "Working tree is clean." : null
  };
};

export const getGitDiff = async (
  projectId: string,
  filePath: string,
  staged = false,
  fileStatus?: GitFileStatus
): Promise<GitDiffResult> => {
  await ensureGitInstalled();
  const projectPath = getProjectPath(projectId);

  if (!(await ensureRepo(projectPath))) {
    return {
      filePath,
      staged,
      isBinary: false,
      truncated: false,
      diff: "",
      message: "This folder is not a git repository."
    };
  }

  const relativePath = toRepoRelativePath(projectPath, filePath);
  const resolvedStatus =
    fileStatus ?? (await getGitStatus(projectId)).files.find((file) => file.path === relativePath)?.status;

  if (resolvedStatus === "untracked") {
    const stdout = await readUntrackedDiff(projectPath, relativePath);
    return {
      ...formatDiffResult(relativePath, false, stdout),
      message: stdout.trim() ? "New untracked file." : "Untracked file has no diff content."
    };
  }

  const args = staged
    ? ["diff", "--cached", "--", relativePath]
    : ["diff", "--", relativePath];
  const result = await runGit(projectPath, args);

  if (result.exitCode !== 0 && result.exitCode !== 1) {
    throw new Error(result.stderr || "Failed to read git diff.");
  }

  return formatDiffResult(relativePath, staged, result.stdout);
};

export const createGitBranch = async (projectId: string, branchName: string): Promise<GitStatusResult> => {
  await ensureGitInstalled();
  const projectPath = getProjectPath(projectId);

  if (!(await ensureRepo(projectPath))) {
    throw new Error("This folder is not a git repository.");
  }

  const result = await runGit(projectPath, ["checkout", "-b", branchName]);

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to create branch.");
  }

  return getGitStatus(projectId);
};

export const stageGitFiles = async (projectId: string, filePaths: string[]): Promise<GitStatusResult> => {
  await ensureGitInstalled();
  const projectPath = getProjectPath(projectId);

  if (!(await ensureRepo(projectPath))) {
    throw new Error("This folder is not a git repository.");
  }

  const relativePaths = filePaths.map((filePath) => toRepoRelativePath(projectPath, filePath));
  const result = await runGit(projectPath, ["add", "--", ...relativePaths]);

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to stage files.");
  }

  return getGitStatus(projectId);
};

export const commitGitChanges = async (projectId: string, message: string): Promise<GitCommitResult> => {
  await ensureGitInstalled();
  const projectPath = getProjectPath(projectId);

  if (!(await ensureRepo(projectPath))) {
    throw new Error("This folder is not a git repository.");
  }

  const result = await runGit(projectPath, ["commit", "-m", message]);

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to commit staged changes.");
  }

  const hashResult = await runGit(projectPath, ["rev-parse", "--short", "HEAD"]);

  return {
    commitHash: hashResult.exitCode === 0 ? hashResult.stdout.trim() : null,
    summary: result.stdout.trim() || "Commit created."
  };
};
