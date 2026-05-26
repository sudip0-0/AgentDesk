import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { eq } from "drizzle-orm";
import type { OpenProjectResult, ProjectSummary } from "../../../shared/projectTypes.js";
import { detectProjectMetadata } from "../../projects/detectProjectMetadata.js";
import { normalizeProjectPath } from "../../projects/projectPaths.js";
import { getDatabase } from "../client.js";
import { projects } from "../schema.js";

const toProjectSummary = (project: typeof projects.$inferSelect): ProjectSummary => ({
  id: project.id,
  name: project.name,
  path: project.path,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  metadata: detectProjectMetadata(project.path)
});

export const listProjects = (): ProjectSummary[] => {
  const database = getDatabase();

  return database
    .select()
    .from(projects)
    .all()
    .filter((project) => project.id !== "default-project" && !project.path.startsWith("probe://"))
    .map(toProjectSummary);
};

export const getProjectById = (projectId: string): ProjectSummary | null => {
  const database = getDatabase();
  const project = database.select().from(projects).where(eq(projects.id, projectId)).get();

  return project ? toProjectSummary(project) : null;
};

export const openProjectFromPath = (folderPath: string): OpenProjectResult => {
  const database = getDatabase();
  const normalizedPath = normalizeProjectPath(folderPath);
  const existing = database.select().from(projects).where(eq(projects.path, normalizedPath)).get();
  const metadata = detectProjectMetadata(normalizedPath);
  const now = new Date().toISOString();

  if (existing) {
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
      project: getProjectById(existing.id) ?? toProjectSummary(existing),
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
    project: toProjectSummary(project),
    duplicate: false
  };
};
