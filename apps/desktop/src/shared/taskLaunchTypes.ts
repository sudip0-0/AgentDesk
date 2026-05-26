import type { TaskRecord } from "./taskTypes.js";

export interface TaskTerminalLaunch {
  projectId: string;
  task: TaskRecord;
}
