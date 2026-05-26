import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { desc, eq } from "drizzle-orm";
import { buildDefaultDocumentMarkdown, buildProgressMarkdown } from "../../shared/documentGenerator.js";
import type {
  DocumentPreviewFile,
  DocumentsPreviewResult,
  DocumentsWriteInput,
  DocumentsWriteResult,
  ProgressPreviewResult
} from "../../shared/documentTypes.js";
import { defaultDocumentNames } from "../../shared/documentTypes.js";
import type { QualityCheckRecord, QualityCheckStatus } from "../../shared/qualityTypes.js";
import { getProjectOverview } from "../db/repositories/projectOverviewRepository.js";
import { getProjectById } from "../db/repositories/projectRepository.js";
import { listTasks } from "../db/repositories/taskRepository.js";
import { isPathInsideRoot } from "../projects/projectPaths.js";
import { getDatabase } from "../db/client.js";
import { qualityChecks } from "../db/schema.js";

const getProjectOrThrow = (projectId: string) => {
  const project = getProjectById(projectId);

  if (!project) {
    throw new Error("Project was not found.");
  }

  return project;
};

const toQualityCheckRecord = (check: typeof qualityChecks.$inferSelect): QualityCheckRecord => ({
  id: check.id,
  agentRunId: check.agentRunId,
  projectId: check.projectId,
  taskId: check.taskId,
  label: check.label,
  command: check.command,
  status: check.status as QualityCheckStatus,
  output: check.output ?? "",
  exitCode: check.exitCode,
  startedAt: check.startedAt,
  finishedAt: check.finishedAt
});

const listRecentQualityChecks = (projectId: string): QualityCheckRecord[] => {
  const database = getDatabase();

  return database
    .select()
    .from(qualityChecks)
    .where(eq(qualityChecks.projectId, projectId))
    .orderBy(desc(qualityChecks.startedAt))
    .limit(20)
    .all()
    .map(toQualityCheckRecord);
};

const ensurePreviewPath = (projectPath: string, file: DocumentPreviewFile): void => {
  const expectedPath = resolve(projectPath, file.name);

  if (resolve(file.path) !== expectedPath || !isPathInsideRoot(projectPath, file.path)) {
    throw new Error(`Document path is outside the selected project: ${file.name}`);
  }
};

export const previewDefaultDocuments = (projectId: string): DocumentsPreviewResult => {
  const project = getProjectOrThrow(projectId);
  const overview = getProjectOverview(projectId);
  const tasks = listTasks(projectId);
  const qualityChecksForProject = listRecentQualityChecks(projectId);
  const generatedAt = new Date().toISOString();

  return {
    projectId,
    files: defaultDocumentNames.map((name) => {
      const path = join(project.path, name);

      return {
        name,
        path,
        content: buildDefaultDocumentMarkdown({
          fileName: name,
          overview,
          tasks,
          qualityChecks: qualityChecksForProject,
          generatedAt
        }),
        exists: existsSync(path)
      };
    })
  };
};

export const previewProgressDocument = (projectId: string): ProgressPreviewResult => {
  const project = getProjectOrThrow(projectId);
  const overview = getProjectOverview(projectId);
  const tasks = listTasks(projectId);
  const qualityChecksForProject = listRecentQualityChecks(projectId);
  const path = join(project.path, "PROGRESS.md");

  return {
    projectId,
    file: {
      name: "PROGRESS.md",
      path,
      content: buildProgressMarkdown({
        overview,
        tasks,
        qualityChecks: qualityChecksForProject,
        generatedAt: new Date().toISOString()
      }),
      exists: existsSync(path)
    }
  };
};

export const writePreviewedDocuments = (input: DocumentsWriteInput): DocumentsWriteResult => {
  const project = getProjectOrThrow(input.projectId);
  const writtenFiles: string[] = [];

  for (const file of input.files) {
    ensurePreviewPath(project.path, file);
    writeFileSync(resolve(file.path), file.content, "utf8");
    writtenFiles.push(file.path);
  }

  return { writtenFiles };
};
