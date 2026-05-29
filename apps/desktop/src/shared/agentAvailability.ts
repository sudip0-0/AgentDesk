/**
 * Pure helpers for resolving whether an agent CLI command is installed.
 *
 * Filesystem access stays in the main process (architecture boundary). This
 * module only builds the list of candidate executable paths to probe, so the
 * resolution logic can be unit tested without touching disk.
 */

export interface AgentAvailability {
  profileId: string;
  command: string;
  installed: boolean;
  resolvedPath: string | null;
  message: string;
}

export interface AgentCommandTestResult {
  profileId: string;
  command: string;
  installed: boolean;
  exitCode: number | null;
  output: string;
  durationMs: number;
  message: string;
}

const hasPathSeparator = (command: string, platform: NodeJS.Platform): boolean =>
  command.includes("/") || (platform === "win32" && command.includes("\\"));

const joinPath = (dir: string, file: string, platform: NodeJS.Platform): string => {
  const separator = platform === "win32" ? "\\" : "/";
  const trimmed = dir.endsWith("/") || dir.endsWith("\\") ? dir.slice(0, -1) : dir;
  return `${trimmed}${separator}${file}`;
};

const windowsExtensions = (pathExt: string | undefined): string[] => {
  const fallback = ".COM;.EXE;.BAT;.CMD";
  return (pathExt && pathExt.trim() ? pathExt : fallback)
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const withWindowsExtensions = (base: string, pathExt: string | undefined): string[] => {
  // Already has a known extension -> probe as-is plus extension variants.
  const candidates = [base];

  for (const extension of windowsExtensions(pathExt)) {
    if (!base.toLowerCase().endsWith(extension.toLowerCase())) {
      candidates.push(`${base}${extension}`);
    }
  }

  return candidates;
};

/**
 * Builds the ordered list of absolute paths to probe for an executable.
 * On Windows each directory candidate is expanded with PATHEXT extensions.
 */
export const buildExecutableCandidates = (
  command: string,
  env: { path?: string; pathExt?: string },
  platform: NodeJS.Platform = process.platform
): string[] => {
  const trimmed = command.trim();

  if (!trimmed) {
    return [];
  }

  const expand = (base: string): string[] =>
    platform === "win32" ? withWindowsExtensions(base, env.pathExt) : [base];

  if (hasPathSeparator(trimmed, platform)) {
    return expand(trimmed);
  }

  const pathDirs = (env.path ?? "")
    .split(platform === "win32" ? ";" : ":")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const candidates: string[] = [];

  for (const dir of pathDirs) {
    for (const candidate of expand(joinPath(dir, trimmed, platform))) {
      candidates.push(candidate);
    }
  }

  return candidates;
};

/** Version-style probe arguments tried when testing whether a command responds. */
export const versionProbeArgs = ["--version"];
