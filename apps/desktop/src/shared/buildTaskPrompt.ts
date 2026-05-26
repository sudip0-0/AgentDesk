import type { ProjectSummary } from "./projectTypes.js";
import type { TaskRecord } from "./taskTypes.js";
import { buildPrompt, createPromptContext } from "./promptEngine.js";

export const buildImplementationPrompt = (
  task: TaskRecord,
  project: Pick<ProjectSummary, "name" | "path">
): string => buildPrompt("implementation", createPromptContext(project, task));
