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
import type { OpenProjectResult, ProjectSummary } from "../shared/projectTypes.js";
import type {
  ExportTerminalLogResult,
  ListTerminalLogChunksRequest,
  TerminalLogChunk,
  TerminalLogMeta
} from "../shared/runLogTypes.js";

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
    getPhase: (): string => "Project Workspace"
  },
  db: {
    getHealth: (): Promise<DatabaseHealth> => ipcRenderer.invoke("db:health") as Promise<DatabaseHealth>
  },
  projects: {
    list: (): Promise<ProjectSummary[]> =>
      ipcRenderer.invoke("project:list") as Promise<ProjectSummary[]>,
    openFolder: (): Promise<OpenProjectResult | null> =>
      ipcRenderer.invoke("project:open-folder") as Promise<OpenProjectResult | null>
  },
  runs: {
    getLogMeta: (runId: string): Promise<TerminalLogMeta> =>
      ipcRenderer.invoke("runs:log-meta", { runId }) as Promise<TerminalLogMeta>,
    listLogChunks: (request: ListTerminalLogChunksRequest): Promise<TerminalLogChunk[]> =>
      ipcRenderer.invoke("runs:log-chunks", request) as Promise<TerminalLogChunk[]>,
    exportLog: (runId: string): Promise<ExportTerminalLogResult> =>
      ipcRenderer.invoke("runs:export-log", { runId }) as Promise<ExportTerminalLogResult>
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
