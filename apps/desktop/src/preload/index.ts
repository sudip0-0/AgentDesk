import { contextBridge, ipcRenderer } from "electron";
import type { AgentDeskApi } from "../shared/agentdeskApi.js";
import type {
  CreateTerminalRequest,
  CreateTerminalResult,
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
  ExportTerminalLogResult,
  ListTerminalLogChunksRequest,
  RunLogRequest,
  TerminalLogChunk,
  TerminalLogMeta
} from "../shared/runLogTypes.js";
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
type Unsubscribe = () => void;

const subscribe = <T>(
  channel: "terminal:data" | "terminal:exit" | "terminal:error",
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
    getPhase: (): string => "Prompt Engine"
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
  runs: {
    getLogMeta: (request: RunLogRequest): Promise<TerminalLogMeta> =>
      ipcRenderer.invoke("runs:log-meta", request) as Promise<TerminalLogMeta>,
    listLogChunks: (request: ListTerminalLogChunksRequest): Promise<TerminalLogChunk[]> =>
      ipcRenderer.invoke("runs:log-chunks", request) as Promise<TerminalLogChunk[]>,
    exportLog: (request: RunLogRequest): Promise<ExportTerminalLogResult> =>
      ipcRenderer.invoke("runs:export-log", request) as Promise<ExportTerminalLogResult>
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
      subscribe<TerminalErrorEvent>("terminal:error", listener)
  }
};

contextBridge.exposeInMainWorld("agentdesk", agentdeskApi);
