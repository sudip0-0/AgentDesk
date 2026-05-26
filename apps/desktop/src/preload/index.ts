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
    getPhase: (): string => "Terminal Engine"
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
