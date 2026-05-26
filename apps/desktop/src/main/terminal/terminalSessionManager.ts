import type { WebContents } from "electron";
import { randomUUID } from "node:crypto";
import { spawn, type IPty } from "node-pty";
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
  ownerWebContentsId: number;
  pty: IPty;
}

export class TerminalSessionManager {
  private readonly sessions = new Map<string, TerminalSession>();

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

    const pty = spawn(shell, [], {
      name: "xterm-256color",
      cols: size.cols,
      rows: size.rows,
      cwd,
      env: process.env
    });

    this.sessions.set(id, {
      id,
      ownerWebContentsId: webContents.id,
      pty
    });

    pty.onData((data) => {
      if (!webContents.isDestroyed()) {
        webContents.send("terminal:data", { id, data: redactSecrets(data) });
      }
    });

    pty.onExit(({ exitCode, signal }) => {
      this.sessions.delete(id);
      if (!webContents.isDestroyed()) {
        const event: TerminalExitEvent = { id, exitCode, signal };
        webContents.send("terminal:exit", event);
      }
    });

    return { id, cwd, shell };
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
    session.pty.kill();
    this.sessions.delete(id);
  }

  public killForWebContents(webContentsId: number): void {
    for (const session of this.sessions.values()) {
      if (session.ownerWebContentsId === webContentsId) {
        session.pty.kill();
        this.sessions.delete(session.id);
      }
    }
  }

  public killAll(): void {
    for (const session of this.sessions.values()) {
      session.pty.kill();
    }

    this.sessions.clear();
  }

  private getOwnedSession(id: string, webContentsId: number): TerminalSession {
    const session = this.sessions.get(id);

    if (!session || session.ownerWebContentsId !== webContentsId) {
      throw new Error("Terminal session was not found.");
    }

    return session;
  }
}
