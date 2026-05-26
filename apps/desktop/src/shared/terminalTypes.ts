export interface CreateTerminalRequest {
  cwd?: string;
  cols?: number;
  rows?: number;
}

export interface CreateTerminalResult {
  id: string;
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
