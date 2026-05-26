import type { TaskRecord } from "./taskTypes.js";
import { buildPrompt } from "./promptEngine.js";

export const buildImplementationPrompt = (
  task: TaskRecord,
  projectName: string
): string =>
  buildPrompt("implementation", {
    project: { name: projectName, path: "Not provided." },
    task
  });
