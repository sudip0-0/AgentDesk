import { existsSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export const normalizeProjectPath = (folderPath: string): string => {
  const trimmed = folderPath.trim();

  if (!trimmed) {
    throw new Error("Project folder path is required.");
  }

  const absolutePath = resolve(trimmed);

  if (!existsSync(absolutePath)) {
    throw new Error("Project folder does not exist.");
  }

  if (!statSync(absolutePath).isDirectory()) {
    throw new Error("Selected path is not a folder.");
  }

  return realpathSync(absolutePath);
};

export const isPathInsideRoot = (rootPath: string, candidatePath: string): boolean => {
  const root = normalizeProjectPath(rootPath);
  const candidate = normalizeProjectPath(candidatePath);
  const relativePath = relative(root, candidate);

  return relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
};
