import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { eq } from "drizzle-orm";
import type {
  OpenProjectResult,
  PackageManager,
  ProjectMetadata,
  ProjectSummary
} from "../../../shared/projectTypes.js";
import { detectProjectMetadata } from "../../projects/detectProjectMetadata.js";
import { normalizeProjectPath } from "../../projects/projectPaths.js";
import { DEFAULT_PROJECT_ID } from "../constants.js";
import { getDatabase } from "../client.js";
import { projects } from "../schema.js";

const isUserProject = (project: typeof projects.$inferSelect): boolean =>
  project.id !== DEFAULT_PROJECT_ID && !project.path.startsWith("probe://");

const metadataFromStoredProject = (project: typeof projects.$inferSelect): ProjectMetadata => {
  const packageManager = (project.packageManager as PackageManager | null) ?? "unknown";

  return {
    hasPackageJson: project.techStack === "node",
    packageManager,
    scripts: [],
    isGitRepo: project.defaultBranch !== null,
    currentBranch: project.defaultBranch
  };
};

const toProjectSummary = (
  project: typeof projects.$inferSelect,
  metadata?: ProjectMetadata
): ProjectSummary => ({
  id: project.id,
  name: project.name,
  path: project.path,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  metadata: metadata ?? metadataFromStoredProject(project)
});

export const listProjects = (): ProjectSummary[] => {
  const database = getDatabase();

  return database
    .select()
    .from(projects)
    .all()
    .filter(isUserProject)
    .map((project) => toProjectSummary(project));
};

export const getProjectById = (projectId: string): ProjectSummary | null => {
  const database = getDatabase();
  const project = database.select().from(projects).where(eq(projects.id, projectId)).get();

  if (!project || !isUserProject(project)) {
    return null;
  }

  return toProjectSummary(project);
};

export const getProjectWithFreshMetadata = (projectId: string): ProjectSummary | null => {
  const project = getProjectById(projectId);

  if (!project) {
    return null;
  }

  return {
    ...project,
    metadata: detectProjectMetadata(project.path)
  };
};

export const openProjectFromPath = (folderPath: string): OpenProjectResult => {
  const database = getDatabase();
  const normalizedPath = normalizeProjectPath(folderPath);
  const existing = database.select().from(projects).where(eq(projects.path, normalizedPath)).get();
  const metadata = detectProjectMetadata(normalizedPath);
  const now = new Date().toISOString();

  if (existing && isUserProject(existing)) {
    database
      .update(projects)
      .set({
        packageManager: metadata.packageManager,
        defaultBranch: metadata.currentBranch,
        techStack: metadata.hasPackageJson ? "node" : null,
        updatedAt: now
      })
      .where(eq(projects.id, existing.id))
      .run();

    return {
      project: {
        ...toProjectSummary(existing, metadata),
        metadata
      },
      duplicate: true
    };
  }

  const project = {
    id: randomUUID(),
    name: basename(normalizedPath),
    path: normalizedPath,
    repoUrl: null,
    defaultBranch: metadata.currentBranch,
    packageManager: metadata.packageManager,
    techStack: metadata.hasPackageJson ? "node" : null,
    createdAt: now,
    updatedAt: now
  };

  database.insert(projects).values(project).run();

  return {
    project: toProjectSummary(project, metadata),
    duplicate: false
  };
};
