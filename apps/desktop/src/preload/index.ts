import { contextBridge, ipcRenderer } from "electron";
import type { AgentDeskApi } from "../shared/agentdeskApi.js";
import type {
  AgentProfileDeleteInput,
  AgentProfileInput,
  AgentProfileRecord,
  AgentProfileUpdateInput
} from "../shared/agentProfileTypes.js";
import type {
  CreateTerminalRequest,
  CreateTerminalResult,
  TerminalActivityEvent,
  TerminalDataEvent,
  TerminalErrorEvent,
  TerminalExitEvent,
  TerminalKillRequest,
  TerminalResizeRequest,
  TerminalWriteRequest
} from "../shared/terminalTypes.js";
import type { DatabaseHealth } from "../shared/dbTypes.js";
import type { OpenProjectResult, ProjectOverview, ProjectSummary } from "../shared/projectTypes.js";
import type {
  CreateFixTaskInput,
  ListQualityChecksInput,
  QualityCheckRecord,
  QualityCommandDeleteInput,
  QualityCommandInput,
  QualityCommandRecord,
  QualityCommandUpdateInput,
  RunQualityChecksInput
} from "../shared/qualityTypes.js";
import type {
  ExportTerminalLogResult,
  ListTerminalLogChunksRequest,
  RunLogRequest,
  TerminalLogChunk,
  TerminalLogMeta
} from "../shared/runLogTypes.js";
import type {
  AgentRunDetail,
  AgentRunDetailRequest,
  AgentRunListItem
} from "../shared/runDetailTypes.js";
import type {
  GitCommitInput,
  GitCommitResult,
  GitCreateBranchInput,
  GitDiffRequest,
  GitDiffResult,
  GitStageFilesInput,
  GitStatusResult
} from "../shared/gitTypes.js";
import type {
  DocumentsPreviewResult,
  DocumentsWriteInput,
  DocumentsWriteResult,
  ProgressPreviewResult
} from "../shared/documentTypes.js";
import type {
  TaskDeleteInput,
  TaskInput,
  TaskRecord,
  TaskStatusUpdateInput,
  TaskUpdateInput
} from "../shared/taskTypes.js";

type TerminalDataListener = (event: TerminalDataEvent) => void;
type TerminalExitListener = (event: TerminalExitEvent) => void;
type TerminalErrorListener = (event: TerminalErrorEvent) => void;
type TerminalActivityListener = (event: TerminalActivityEvent) => void;
type Unsubscribe = () => void;

const subscribe = <T>(
  channel: "terminal:data" | "terminal:exit" | "terminal:error" | "terminal:activity",
  listener: (event: T) => void
): Unsubscribe => {
  const wrappedListener = (_event: Electron.IpcRendererEvent, payload: T): void => {
    listener(payload);
  };

  ipcRenderer.on(channel, wrappedListener);

  return () => {
    ipcRenderer.removeListener(channel, wrappedListener);
  };
};

const agentdeskApi: AgentDeskApi = {
  app: {
    getName: (): string => "AgentDesk",
    getPhase: (): string => "Polish and Portfolio Readiness"
  },
  db: {
    getHealth: (): Promise<DatabaseHealth> => ipcRenderer.invoke("db:health") as Promise<DatabaseHealth>
  },
  projects: {
    list: (): Promise<ProjectSummary[]> =>
      ipcRenderer.invoke("project:list") as Promise<ProjectSummary[]>,
    openFolder: (): Promise<OpenProjectResult | null> =>
      ipcRenderer.invoke("project:open-folder") as Promise<OpenProjectResult | null>,
    getOverview: (projectId: string): Promise<ProjectOverview> =>
      ipcRenderer.invoke("project:get-overview", { projectId }) as Promise<ProjectOverview>
  },
  tasks: {
    list: (projectId: string): Promise<TaskRecord[]> =>
      ipcRenderer.invoke("task:list", { projectId }) as Promise<TaskRecord[]>,
    create: (input: TaskInput): Promise<TaskRecord> =>
      ipcRenderer.invoke("task:create", input) as Promise<TaskRecord>,
    update: (input: TaskUpdateInput): Promise<TaskRecord> =>
      ipcRenderer.invoke("task:update", input) as Promise<TaskRecord>,
    setStatus: (input: TaskStatusUpdateInput): Promise<TaskRecord> =>
      ipcRenderer.invoke("task:set-status", input) as Promise<TaskRecord>,
    delete: (input: TaskDeleteInput): Promise<void> =>
      ipcRenderer.invoke("task:delete", input) as Promise<void>
  },
  agentProfiles: {
    list: (): Promise<AgentProfileRecord[]> =>
      ipcRenderer.invoke("agent-profile:list") as Promise<AgentProfileRecord[]>,
    create: (input: AgentProfileInput): Promise<AgentProfileRecord> =>
      ipcRenderer.invoke("agent-profile:create", input) as Promise<AgentProfileRecord>,
    update: (input: AgentProfileUpdateInput): Promise<AgentProfileRecord> =>
      ipcRenderer.invoke("agent-profile:update", input) as Promise<AgentProfileRecord>,
    delete: (input: AgentProfileDeleteInput): Promise<void> =>
      ipcRenderer.invoke("agent-profile:delete", input) as Promise<void>
  },
  runs: {
    list: (projectId: string): Promise<AgentRunListItem[]> =>
      ipcRenderer.invoke("runs:list", { projectId }) as Promise<AgentRunListItem[]>,
    getDetail: (request: AgentRunDetailRequest): Promise<AgentRunDetail> =>
      ipcRenderer.invoke("runs:get-detail", request) as Promise<AgentRunDetail>,
    getLogMeta: (request: RunLogRequest): Promise<TerminalLogMeta> =>
      ipcRenderer.invoke("runs:log-meta", request) as Promise<TerminalLogMeta>,
    listLogChunks: (request: ListTerminalLogChunksRequest): Promise<TerminalLogChunk[]> =>
      ipcRenderer.invoke("runs:log-chunks", request) as Promise<TerminalLogChunk[]>,
    exportLog: (request: RunLogRequest): Promise<ExportTerminalLogResult> =>
      ipcRenderer.invoke("runs:export-log", request) as Promise<ExportTerminalLogResult>
  },
  quality: {
    listCommands: (projectId: string): Promise<QualityCommandRecord[]> =>
      ipcRenderer.invoke("quality:list-commands", { projectId }) as Promise<QualityCommandRecord[]>,
    createCommand: (input: QualityCommandInput): Promise<QualityCommandRecord> =>
      ipcRenderer.invoke("quality:create-command", input) as Promise<QualityCommandRecord>,
    updateCommand: (input: QualityCommandUpdateInput): Promise<QualityCommandRecord> =>
      ipcRenderer.invoke("quality:update-command", input) as Promise<QualityCommandRecord>,
    deleteCommand: (input: QualityCommandDeleteInput): Promise<void> =>
      ipcRenderer.invoke("quality:delete-command", input) as Promise<void>,
    run: (input: RunQualityChecksInput): Promise<QualityCheckRecord[]> =>
      ipcRenderer.invoke("quality:run", input) as Promise<QualityCheckRecord[]>,
    listChecks: (input: ListQualityChecksInput): Promise<QualityCheckRecord[]> =>
      ipcRenderer.invoke("quality:list-checks", input) as Promise<QualityCheckRecord[]>,
    createFixTask: (input: CreateFixTaskInput): Promise<TaskRecord> =>
      ipcRenderer.invoke("quality:create-fix-task", input) as Promise<TaskRecord>
  },
  git: {
    getStatus: (projectId: string): Promise<GitStatusResult> =>
      ipcRenderer.invoke("git:status", { projectId }) as Promise<GitStatusResult>,
    getDiff: (request: GitDiffRequest): Promise<GitDiffResult> =>
      ipcRenderer.invoke("git:diff", request) as Promise<GitDiffResult>,
    createBranch: (input: GitCreateBranchInput): Promise<GitStatusResult> =>
      ipcRenderer.invoke("git:create-branch", input) as Promise<GitStatusResult>,
    stageFiles: (input: GitStageFilesInput): Promise<GitStatusResult> =>
      ipcRenderer.invoke("git:stage-files", input) as Promise<GitStatusResult>,
    commit: (input: GitCommitInput): Promise<GitCommitResult> =>
      ipcRenderer.invoke("git:commit", input) as Promise<GitCommitResult>
  },
  documents: {
    previewDefaults: (projectId: string): Promise<DocumentsPreviewResult> =>
      ipcRenderer.invoke("documents:preview-defaults", { projectId }) as Promise<DocumentsPreviewResult>,
    previewProgress: (projectId: string): Promise<ProgressPreviewResult> =>
      ipcRenderer.invoke("documents:preview-progress", { projectId }) as Promise<ProgressPreviewResult>,
    write: (input: DocumentsWriteInput): Promise<DocumentsWriteResult> =>
      ipcRenderer.invoke("documents:write", input) as Promise<DocumentsWriteResult>
  },
  terminals: {
    create: (request: CreateTerminalRequest): Promise<CreateTerminalResult> =>
      ipcRenderer.invoke("terminal:create", request) as Promise<CreateTerminalResult>,
    write: (request: TerminalWriteRequest): void => {
      ipcRenderer.send("terminal:write", request);
    },
    resize: (request: TerminalResizeRequest): void => {
      ipcRenderer.send("terminal:resize", request);
    },
    kill: (request: TerminalKillRequest): Promise<void> =>
      ipcRenderer.invoke("terminal:kill", request) as Promise<void>,
    onData: (listener: TerminalDataListener): Unsubscribe =>
      subscribe<TerminalDataEvent>("terminal:data", listener),
    onExit: (listener: TerminalExitListener): Unsubscribe =>
      subscribe<TerminalExitEvent>("terminal:exit", listener),
    onError: (listener: TerminalErrorListener): Unsubscribe =>
      subscribe<TerminalErrorEvent>("terminal:error", listener),
    onActivity: (listener: TerminalActivityListener): Unsubscribe =>
      subscribe<TerminalActivityEvent>("terminal:activity", listener)
  }
};

contextBridge.exposeInMainWorld("agentdesk", agentdeskApi);
