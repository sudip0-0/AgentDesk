import { appendTerminalLogChunk } from "./repositories/terminalLogRepository.js";
import { finishAgentRun, startAgentRun } from "./repositories/agentRunRepository.js";

interface LogBuffer {
  agentRunId: string;
  buffer: string;
  flushTimer: NodeJS.Timeout | null;
}

const FLUSH_INTERVAL_MS = 250;
const FLUSH_SIZE = 4_096;

export class TerminalLogWriter {
  private readonly buffers = new Map<string, LogBuffer>();

  public startSession(input: {
    projectId: string;
    terminalSessionId: string;
    command: string;
    cwd: string;
  }): string {
    return startAgentRun({
      projectId: input.projectId,
      terminalSessionId: input.terminalSessionId,
      command: input.command,
      cwd: input.cwd
    });
  }

  public appendOutput(terminalSessionId: string, agentRunId: string, data: string): void {
    if (!data) {
      return;
    }

    const existing = this.buffers.get(terminalSessionId);

    if (existing) {
      existing.buffer += data;
      if (existing.buffer.length >= FLUSH_SIZE) {
        this.flushBuffer(terminalSessionId);
        return;
      }

      this.scheduleFlush(terminalSessionId);
      return;
    }

    this.buffers.set(terminalSessionId, {
      agentRunId,
      buffer: data,
      flushTimer: null
    });
    this.scheduleFlush(terminalSessionId);
  }

  public endSession(
    terminalSessionId: string,
    agentRunId: string,
    status: "completed" | "failed" | "killed",
    exitCode?: number
  ): void {
    this.flushBuffer(terminalSessionId);
    this.buffers.delete(terminalSessionId);
    finishAgentRun(agentRunId, status, exitCode);
  }

  public flushAll(): void {
    for (const terminalSessionId of this.buffers.keys()) {
      this.flushBuffer(terminalSessionId);
    }
  }

  private scheduleFlush(terminalSessionId: string): void {
    const entry = this.buffers.get(terminalSessionId);

    if (!entry || entry.flushTimer) {
      return;
    }

    entry.flushTimer = setTimeout(() => {
      this.flushBuffer(terminalSessionId);
    }, FLUSH_INTERVAL_MS);
  }

  private flushBuffer(terminalSessionId: string): void {
    const entry = this.buffers.get(terminalSessionId);

    if (!entry) {
      return;
    }

    if (entry.flushTimer) {
      clearTimeout(entry.flushTimer);
      entry.flushTimer = null;
    }

    if (!entry.buffer) {
      return;
    }

    appendTerminalLogChunk(entry.agentRunId, entry.buffer);
    entry.buffer = "";
  }
}
