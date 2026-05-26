import type { DatabaseHealth } from "./dbTypes.js";
import type {
  AgentProfileDeleteInput,
  AgentProfileInput,
  AgentProfileRecord,
  AgentProfileUpdateInput
} from "./agentProfileTypes.js";
import type { OpenProjectResult, ProjectOverview, ProjectSummary } from "./projectTypes.js";
import type {
  CreateFixTaskInput,
  ListQualityChecksInput,
  QualityCheckRecord,
  QualityCommandDeleteInput,
  QualityCommandInput,
  QualityCommandRecord,
  QualityCommandUpdateInput,
  RunQualityChecksInput
} from "./qualityTypes.js";
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
  TerminalActivityEvent,
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
  agentProfiles: {
    list: () => Promise<AgentProfileRecord[]>;
    create: (input: AgentProfileInput) => Promise<AgentProfileRecord>;
    update: (input: AgentProfileUpdateInput) => Promise<AgentProfileRecord>;
    delete: (input: AgentProfileDeleteInput) => Promise<void>;
  };
  runs: {
    getLogMeta: (request: RunLogRequest) => Promise<TerminalLogMeta>;
    listLogChunks: (request: ListTerminalLogChunksRequest) => Promise<TerminalLogChunk[]>;
    exportLog: (request: RunLogRequest) => Promise<ExportTerminalLogResult>;
  };
  quality: {
    listCommands: (projectId: string) => Promise<QualityCommandRecord[]>;
    createCommand: (input: QualityCommandInput) => Promise<QualityCommandRecord>;
    updateCommand: (input: QualityCommandUpdateInput) => Promise<QualityCommandRecord>;
    deleteCommand: (input: QualityCommandDeleteInput) => Promise<void>;
    run: (input: RunQualityChecksInput) => Promise<QualityCheckRecord[]>;
    listChecks: (input: ListQualityChecksInput) => Promise<QualityCheckRecord[]>;
    createFixTask: (input: CreateFixTaskInput) => Promise<unknown>;
  };
  terminals: {
    create: (request: CreateTerminalRequest) => Promise<CreateTerminalResult>;
    write: (request: TerminalWriteRequest) => void;
    resize: (request: TerminalResizeRequest) => void;
    kill: (request: TerminalKillRequest) => Promise<void>;
    onData: (listener: (event: TerminalDataEvent) => void) => Unsubscribe;
    onExit: (listener: (event: TerminalExitEvent) => void) => Unsubscribe;
    onError: (listener: (event: TerminalErrorEvent) => void) => Unsubscribe;
    onActivity: (listener: (event: TerminalActivityEvent) => void) => Unsubscribe;
  };
}
