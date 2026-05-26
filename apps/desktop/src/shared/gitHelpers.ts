import type { GitChangedFile, GitFileStatus } from "./gitTypes.js";

export const branchNameFromTaskTitle = (taskTitle: string): string => {
  const slug = taskTitle
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");

  return slug ? `task/${slug}` : "task/new-branch";
};

const classifyStatus = (indexStatus: string, workTreeStatus: string): GitFileStatus => {
  if (indexStatus === "?" && workTreeStatus === "?") {
    return "untracked";
  }

  const hasIndexChange = indexStatus !== " " && indexStatus !== "?";
  const hasWorkTreeChange = workTreeStatus !== " " && workTreeStatus !== "?";

  if (hasIndexChange && hasWorkTreeChange) {
    return "staged_unstaged";
  }

  if (hasIndexChange) {
    return "staged";
  }

  return "unstaged";
};

export const parseGitPorcelainStatus = (output: string): GitChangedFile[] =>
  output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const indexStatus = line[0] ?? " ";
      const workTreeStatus = line[1] ?? " ";
      const rawPath = line.slice(3);
      const renameParts = rawPath.split(" -> ");
      const renamedPath = rawPath.includes(" -> ") ? renameParts[renameParts.length - 1] ?? rawPath : rawPath;

      return {
        path: renamedPath,
        indexStatus,
        workTreeStatus,
        status: classifyStatus(indexStatus, workTreeStatus)
      };
    });

export const buildGeneratedCommitMessage = (taskTitle: string | null, files: GitChangedFile[]): string => {
  const title = taskTitle?.trim() || "Update project files";
  const changedPaths = files.slice(0, 5).map((file) => `- ${file.path}`);
  const suffix = files.length > 5 ? `\n- and ${files.length - 5} more file(s)` : "";

  return `${title}\n\nChanged files:\n${changedPaths.join("\n")}${suffix}`;
};
