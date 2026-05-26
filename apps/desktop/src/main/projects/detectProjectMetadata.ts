import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PackageManager, ProjectMetadata, ProjectScript } from "../../shared/projectTypes.js";

const lockfileManagers: Array<[string, PackageManager]> = [
  ["pnpm-lock.yaml", "pnpm"],
  ["yarn.lock", "yarn"],
  ["bun.lockb", "bun"],
  ["bun.lock", "bun"],
  ["package-lock.json", "npm"]
];

interface PackageJson {
  packageManager?: unknown;
  scripts?: unknown;
}

const readPackageJson = (projectPath: string): PackageJson | null => {
  const packageJsonPath = join(projectPath, "package.json");

  if (!existsSync(packageJsonPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJson;
  } catch {
    return null;
  }
};

const detectPackageManager = (
  projectPath: string,
  packageJson: PackageJson | null
): PackageManager => {
  for (const [lockfile, manager] of lockfileManagers) {
    if (existsSync(join(projectPath, lockfile))) {
      return manager;
    }
  }

  if (typeof packageJson?.packageManager === "string") {
    const [manager] = packageJson.packageManager.split("@");

    if (manager === "npm" || manager === "pnpm" || manager === "yarn" || manager === "bun") {
      return manager;
    }
  }

  return packageJson ? "npm" : "unknown";
};

const readScripts = (packageJson: PackageJson | null): ProjectScript[] => {
  if (!packageJson?.scripts || typeof packageJson.scripts !== "object") {
    return [];
  }

  return Object.entries(packageJson.scripts)
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .map(([name, command]) => ({ name, command }))
    .sort((left, right) => left.name.localeCompare(right.name));
};

const readCurrentBranch = (projectPath: string): string | null => {
  const headPath = join(projectPath, ".git", "HEAD");

  if (!existsSync(headPath)) {
    return null;
  }

  try {
    const head = readFileSync(headPath, "utf8").trim();
    const prefix = "ref: refs/heads/";

    if (head.startsWith(prefix)) {
      return head.slice(prefix.length);
    }

    if (head.length > 0) {
      return `detached (${head.slice(0, 7)})`;
    }

    return null;
  } catch {
    return null;
  }
};

export const detectProjectMetadata = (projectPath: string): ProjectMetadata => {
  const packageJson = readPackageJson(projectPath);
  const isGitRepo = existsSync(join(projectPath, ".git"));

  return {
    hasPackageJson: packageJson !== null,
    packageManager: detectPackageManager(projectPath, packageJson),
    scripts: readScripts(packageJson),
    isGitRepo,
    currentBranch: isGitRepo ? readCurrentBranch(projectPath) : null
  };
};
