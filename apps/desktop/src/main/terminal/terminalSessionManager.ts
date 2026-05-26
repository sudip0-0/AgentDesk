import type { WebContents } from "electron";
import { randomUUID } from "node:crypto";
import { spawn, type IPty } from "node-pty";
import type { AgentRunStatus } from "../db/repositories/agentRunRepository.js";
import type { TerminalLogWriter } from "../db/terminalLogWriter.js";
import { redactSecrets } from "./logRedaction.js";
import { normalizeTerminalSize, resolveShell, resolveTerminalCwd } from "./terminalConfig.js";
import type {
  CreateTerminalRequest,
  CreateTerminalResult,
  TerminalExitEvent,
  TerminalResizeRequest,
  TerminalWriteRequest
} from "../../shared/terminalTypes.js";

interface TerminalSession {
  id: string;
  agentRunId: string;
  ownerWebContentsId: number;
  closingStatus?: AgentRunStatus;
  pty: IPty;
}

export class TerminalSessionManager {
  private readonly sessions = new Map<string, TerminalSession>();

  public constructor(private readonly logWriter: TerminalLogWriter) {}

  public hasActiveSessions(): boolean {
    return this.sessions.size > 0;
  }

  public create(
    request: CreateTerminalRequest,
    webContents: WebContents
  ): CreateTerminalResult {
    const cwd = resolveTerminalCwd(request.cwd);
    const size = normalizeTerminalSize(request.cols, request.rows);
    const shell = resolveShell(request.shell);
    const id = randomUUID();
    const agentRunId = this.logWriter.startSession({
      terminalSessionId: id,
      command: shell,
      cwd
    });

    const pty = spawn(shell, [], {
      name: "xterm-256color",
      cols: size.cols,
      rows: size.rows,
      cwd,
      env: process.env
    });

    this.sessions.set(id, {
      id,
      agentRunId,
      ownerWebContentsId: webContents.id,
      pty
    });

    pty.onData((data) => {
      const redacted = redactSecrets(data);
      this.logWriter.appendOutput(id, agentRunId, redacted);

      if (!webContents.isDestroyed()) {
        webContents.send("terminal:data", { id, data: redacted });
      }
    });

    pty.onExit(({ exitCode, signal }) => {
      const session = this.sessions.get(id);
      const status: "completed" | "failed" | "killed" =
        session?.closingStatus === "killed"
          ? "killed"
          : exitCode === 0
            ? "completed"
            : "failed";

      this.logWriter.endSession(id, agentRunId, status, exitCode);
      this.sessions.delete(id);

      if (!webContents.isDestroyed()) {
        const event: TerminalExitEvent = { id, exitCode, signal };
        webContents.send("terminal:exit", event);
      }
    });

    return { id, runId: agentRunId, cwd, shell };
  }

  public write(request: TerminalWriteRequest, webContents: WebContents): void {
    const session = this.getOwnedSession(request.id, webContents.id);
    session.pty.write(request.data);
  }

  public resize(request: TerminalResizeRequest, webContents: WebContents): void {
    const session = this.getOwnedSession(request.id, webContents.id);
    const size = normalizeTerminalSize(request.cols, request.rows);
    session.pty.resize(size.cols, size.rows);
  }

  public kill(id: string, webContents: WebContents): void {
    const session = this.getOwnedSession(id, webContents.id);
    session.closingStatus = "killed";
    session.pty.kill();
  }

  public killForWebContents(webContentsId: number): void {
    for (const session of this.sessions.values()) {
      if (session.ownerWebContentsId === webContentsId) {
        session.closingStatus = "killed";
        session.pty.kill();
      }
    }
  }

  public killAll(): void {
    for (const session of this.sessions.values()) {
      session.closingStatus = "killed";
      session.pty.kill();
    }
  }

  private getOwnedSession(id: string, webContentsId: number): TerminalSession {
    const session = this.sessions.get(id);

    if (!session || session.ownerWebContentsId !== webContentsId) {
      throw new Error("Terminal session was not found.");
    }

    return session;
  }
}
