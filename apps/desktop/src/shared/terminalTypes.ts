export type TerminalShell = "powershell" | "cmd";

export interface CreateTerminalRequest {
  projectId: string;
  cwd?: string;
  cols?: number;
  rows?: number;
  shell?: TerminalShell;
}

export interface CreateTerminalResult {
  id: string;
  runId: string;
  cwd: string;
  shell: string;
}

export interface TerminalDataEvent {
  id: string;
  data: string;
}

export interface TerminalExitEvent {
  id: string;
  exitCode: number;
  signal?: number;
}

export interface TerminalErrorEvent {
  id: string;
  message: string;
}

export interface TerminalResizeRequest {
  id: string;
  cols: number;
  rows: number;
}

export interface TerminalWriteRequest {
  id: string;
  data: string;
}

export interface TerminalKillRequest {
  id: string;
}
