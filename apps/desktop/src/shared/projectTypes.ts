export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "unknown";

export interface ProjectScript {
  name: string;
  command: string;
}

export interface ProjectMetadata {
  hasPackageJson: boolean;
  packageManager: PackageManager;
  scripts: ProjectScript[];
  isGitRepo: boolean;
  currentBranch: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
  metadata: ProjectMetadata;
}

export interface OpenProjectResult {
  project: ProjectSummary;
  duplicate: boolean;
}
