import type { DatabaseHealth } from "./dbTypes.js";
import type {
  ExportTerminalLogResult,
  ListTerminalLogChunksRequest,
  TerminalLogChunk,
  TerminalLogMeta
} from "./runLogTypes.js";
import type {
  CreateTerminalRequest,
  CreateTerminalResult,
  TerminalDataEvent,
  TerminalErrorEvent,
  TerminalExitEvent,
  TerminalKillRequest,
  TerminalResizeRequest,
  TerminalWriteRequest
} from "./terminalTypes.js";

type Unsubscribe = () => void;

export interface AgentDeskApi {
  app: {
    getName: () => string;
    getPhase: () => string;
  };
  db: {
    getHealth: () => Promise<DatabaseHealth>;
  };
  runs: {
    getLogMeta: (runId: string) => Promise<TerminalLogMeta>;
    listLogChunks: (request: ListTerminalLogChunksRequest) => Promise<TerminalLogChunk[]>;
    exportLog: (runId: string) => Promise<ExportTerminalLogResult>;
  };
  terminals: {
    create: (request: CreateTerminalRequest) => Promise<CreateTerminalResult>;
    write: (request: TerminalWriteRequest) => void;
    resize: (request: TerminalResizeRequest) => void;
    kill: (request: TerminalKillRequest) => Promise<void>;
    onData: (listener: (event: TerminalDataEvent) => void) => Unsubscribe;
    onExit: (listener: (event: TerminalExitEvent) => void) => Unsubscribe;
    onError: (listener: (event: TerminalErrorEvent) => void) => Unsubscribe;
  };
}
