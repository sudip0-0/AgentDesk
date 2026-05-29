import type { AgentProfileRecord } from "./agentProfileTypes.js";
import type { GitChangedFile } from "./gitTypes.js";
import type { QualityCheckRecord } from "./qualityTypes.js";
import type { TerminalLogMeta } from "./runLogTypes.js";
import type { TaskRecord } from "./taskTypes.js";

export interface AgentRunListItem {
  id: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string | null;
  agentProfileId: string | null;
  agentName: string | null;
  command: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  durationMs: number | null;
}

export interface AgentRunDetail {
  id: string;
  projectId: string;
  command: string;
  prompt: string | null;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  durationMs: number | null;
  notes: string | null;
  errorMessage: string | null;
  task: TaskRecord | null;
  agent: Pick<AgentProfileRecord, "id" | "name" | "mode" | "command"> | null;
  transcript: string;
  transcriptTruncated: boolean;
  logMeta: TerminalLogMeta;
  changedFiles: GitChangedFile[];
  qualityResults: QualityCheckRecord[];
}

export interface AgentRunDetailRequest {
  projectId: string;
  runId: string;
}
