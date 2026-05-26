import type { DatabaseHealth } from "./dbTypes.js";
import type { OpenProjectResult, ProjectOverview, ProjectSummary } from "./projectTypes.js";
import type {
  ExportTerminalLogResult,
  ListTerminalLogChunksRequest,
  RunLogRequest,
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
import type {
  TaskDeleteInput,
  TaskInput,
  TaskRecord,
  TaskStatusUpdateInput,
  TaskUpdateInput
} from "./taskTypes.js";

type Unsubscribe = () => void;

export interface AgentDeskApi {
  app: {
    getName: () => string;
    getPhase: () => string;
  };
  db: {
    getHealth: () => Promise<DatabaseHealth>;
  };
  projects: {
    list: () => Promise<ProjectSummary[]>;
    openFolder: () => Promise<OpenProjectResult | null>;
    getOverview: (projectId: string) => Promise<ProjectOverview>;
  };
  tasks: {
    list: (projectId: string) => Promise<TaskRecord[]>;
    create: (input: TaskInput) => Promise<TaskRecord>;
    update: (input: TaskUpdateInput) => Promise<TaskRecord>;
    setStatus: (input: TaskStatusUpdateInput) => Promise<TaskRecord>;
    delete: (input: TaskDeleteInput) => Promise<void>;
  };
  runs: {
    getLogMeta: (request: RunLogRequest) => Promise<TerminalLogMeta>;
    listLogChunks: (request: ListTerminalLogChunksRequest) => Promise<TerminalLogChunk[]>;
    exportLog: (request: RunLogRequest) => Promise<ExportTerminalLogResult>;
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
