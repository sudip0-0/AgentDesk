export interface TerminalLogChunk {
  id: string;
  sequence: number;
  chunk: string;
  createdAt: string;
}

export interface TerminalLogMeta {
  chunkCount: number;
  characterCount: number;
}

export interface RunLogRequest {
  runId: string;
  projectId: string;
}

export interface ListTerminalLogChunksRequest extends RunLogRequest {
  offset?: number;
  limit?: number;
}

export interface ExportTerminalLogResult {
  exported: boolean;
  filePath?: string;
}
