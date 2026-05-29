import type { WebContents } from "electron";
import { randomUUID } from "node:crypto";
import { spawn, type IPty } from "node-pty";
import { buildAgentLaunchConfig } from "../../shared/agentCommandBuilder.js";
import { classifyCommand, describeCommandRisk } from "../../shared/commandSafety.js";
import { writePromptToTerminal } from "../../shared/promptDelivery.js";
import type { AgentRunStatus } from "../db/repositories/agentRunRepository.js";
import { getAgentProfileById } from "../db/repositories/agentProfileRepository.js";
import { getAppSettings } from "../db/repositories/settingsRepository.js";
import { getProjectById } from "../db/repositories/projectRepository.js";
import {
  assertTaskBelongsToProject,
  getTaskById,
  setTaskStatus
} from "../db/repositories/taskRepository.js";
import type { TerminalLogWriter } from "../db/terminalLogWriter.js";
import { buildPrompt } from "../../shared/promptEngine.js";
import { isPathInsideRoot } from "../projects/projectPaths.js";
import { redactSecrets } from "./logRedaction.js";
import { normalizeTerminalSize, resolveShell, resolveTerminalCwd } from "./terminalConfig.js";
import {
  appendOutputTail,
  detectWaitingForInput,
  type TerminalActivityState
} from "../../shared/terminalActivity.js";
import { isSessionIdle } from "../../shared/terminalIdle.js";
import type {
  CreateTerminalRequest,
  CreateTerminalResult,
  TerminalActivityEvent,
  TerminalExitEvent,
  TerminalResizeRequest,
  TerminalWriteRequest
} from "../../shared/terminalTypes.js";
import type { ProjectSummary } from "../../shared/projectTypes.js";
import type { TaskStatus } from "../../shared/taskTypes.js";

interface TerminalSession {
  id: string;
  agentRunId: string;
  projectId: string;
  taskId: string | null;
  agentProfileId: string | null;
  ownerWebContentsId: number;
  activityState: TerminalActivityState;
  outputTail: string;
  lastOutputAt: number;
  closingStatus?: AgentRunStatus;
  webContents: WebContents;
  pty: IPty;
}

type ProjectResolver = (projectId?: string) => ProjectSummary | null;

const resolveProjectFromDatabase: ProjectResolver = (projectId) =>
  projectId ? getProjectById(projectId) : null;

const resolveTaskStatusAfterExit = (exitCode: number): TaskStatus =>
  exitCode === 0 ? "needs_review" : "failed";

const IDLE_CHECK_INTERVAL_MS = 5_000;

export class TerminalSessionManager {
  private readonly sessions = new Map<string, TerminalSession>();
  private idleTimer: NodeJS.Timeout | null = null;

  public constructor(
    private readonly logWriter: TerminalLogWriter,
    private readonly resolveProject: ProjectResolver = resolveProjectFromDatabase,
    private readonly getIdleThresholdMs: () => number = () => getAppSettings().idleWarningSeconds * 1_000
  ) {}

  public hasActiveSessions(): boolean {
    return this.sessions.size > 0;
  }

  public create(
    request: CreateTerminalRequest,
    webContents: WebContents
  ): CreateTerminalResult {
    if (!request.projectId) {
      throw new Error("A project id is required to start a terminal.");
    }

    const project = this.resolveProject(request.projectId);

    if (!project) {
      throw new Error("Selected project was not found.");
    }

    let linkedTask = null;

    if (request.taskId) {
      assertTaskBelongsToProject(request.taskId, project.id);
      linkedTask = getTaskById(request.taskId);

      if (!linkedTask) {
        throw new Error("Task was not found for this project.");
      }

      setTaskStatus({
        projectId: project.id,
        id: linkedTask.id,
        status: "running"
      });
    }

    if (request.agentProfileId && !request.taskId) {
      throw new Error("Agent profile launch requires a linked task.");
    }

    const profile = request.agentProfileId ? getAgentProfileById(request.agentProfileId) : null;

    if (request.agentProfileId && !profile) {
      throw new Error("Agent profile was not found.");
    }

    if (request.agentProfileId && !linkedTask) {
      throw new Error("Agent profile launch requires a linked task.");
    }

    const requestedCwd = profile?.workingDirectoryBehavior === "project_root" ? undefined : request.cwd;
    const cwd = resolveTerminalCwd(requestedCwd, project.path);

    if (!isPathInsideRoot(project.path, cwd)) {
      throw new Error("Working directory must be inside the selected project folder.");
    }

    const size = normalizeTerminalSize(request.cols, request.rows);
    const id = randomUUID();
    const prompt = linkedTask ? buildPrompt("implementation", { project, task: linkedTask }) : undefined;
    const panelShell = resolveShell(request.shell);
    const command =
      profile && linkedTask && prompt
        ? buildAgentLaunchConfig(profile, { project, task: linkedTask, prompt, cwd })
        : null;

    if (command) {
      const risk = classifyCommand(command.displayCommand);

      if (risk.level === "block" && getAppSettings().blockDestructiveCommands) {
        if (linkedTask) {
          setTaskStatus({ projectId: project.id, id: linkedTask.id, status: "ready" });
        }

        throw new Error(
          `AgentDesk blocked this agent launch for safety. ${describeCommandRisk(risk)} Adjust the agent profile command or disable command blocking in Settings.`
        );
      }
    }

    const executable = command?.spawnExecutable ?? panelShell;
    const args = command?.spawnArgs ?? [];
    const displayCommand = command?.displayCommand ?? panelShell;
    const agentRunId = this.logWriter.startSession({
      projectId: project.id,
      terminalSessionId: id,
      command: displayCommand,
      cwd,
      taskId: linkedTask?.id,
      agentProfileId: profile?.id,
      prompt
    });

    let pty: IPty;

    try {
      pty = spawn(executable, args, {
        name: "xterm-256color",
        cols: size.cols,
        rows: size.rows,
        cwd,
        env: {
          ...process.env,
          ...command?.env
        }
      });
    } catch (spawnError) {
      const reason = spawnError instanceof Error ? spawnError.message : "Unknown error";
      const hint =
        profile && /enoent|not found|cannot find/i.test(reason)
          ? ` Check that "${profile.command}" is installed and on your PATH.`
          : "";
      const failureMessage = `Failed to start terminal for "${displayCommand}".${hint} (${reason})`;

      this.logWriter.endSession(id, agentRunId, "failed", undefined, failureMessage);

      if (linkedTask) {
        setTaskStatus({
          projectId: project.id,
          id: linkedTask.id,
          status: "ready"
        });
      }

      throw new Error(failureMessage);
    }

    this.sessions.set(id, {
      id,
      agentRunId,
      projectId: project.id,
      taskId: linkedTask?.id ?? null,
      agentProfileId: profile?.id ?? null,
      ownerWebContentsId: webContents.id,
      activityState: "busy",
      outputTail: "",
      lastOutputAt: Date.now(),
      webContents,
      pty
    });
    this.ensureIdleWatchdog();

    if (command?.promptWillBeSentToStdin && prompt) {
      setTimeout(() => {
        void (async () => {
          if (!this.sessions.has(id)) {
            return;
          }

          await writePromptToTerminal(prompt, (data) => {
            pty.write(data);
          });
        })();
      }, 500);
    }

    pty.onData((data) => {
      const redacted = redactSecrets(data);
      this.logWriter.appendOutput(id, agentRunId, redacted);

      const session = this.sessions.get(id);

      if (session) {
        session.outputTail = appendOutputTail(session.outputTail, redacted);
        session.lastOutputAt = Date.now();
        this.updateActivityState(session, webContents);
      }

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
      this.syncTaskStatusAfterExit(session, exitCode);
      this.sessions.delete(id);
      this.stopIdleWatchdogIfEmpty();

      if (!webContents.isDestroyed()) {
        const event: TerminalExitEvent = { id, exitCode, signal };
        webContents.send("terminal:exit", event);
      }
    });

    return { id, runId: agentRunId, cwd, shell: profile?.name ?? panelShell };
  }

  public write(request: TerminalWriteRequest, webContents: WebContents): void {
    const session = this.getOwnedSession(request.id, webContents.id);
    session.pty.write(request.data);
    session.lastOutputAt = Date.now();
    this.setActivityState(session, "busy", webContents);
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

  private ensureIdleWatchdog(): void {
    if (this.idleTimer) {
      return;
    }

    this.idleTimer = setInterval(() => {
      this.checkIdleSessions();
    }, IDLE_CHECK_INTERVAL_MS);

    // Do not keep the process alive solely for the idle watchdog.
    this.idleTimer.unref?.();
  }

  private stopIdleWatchdogIfEmpty(): void {
    if (this.sessions.size === 0 && this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private checkIdleSessions(): void {
    const now = Date.now();
    const idleThresholdMs = this.getIdleThresholdMs();

    for (const session of this.sessions.values()) {
      // Only escalate busy sessions; do not override a detected input prompt.
      if (session.activityState !== "busy") {
        continue;
      }

      if (isSessionIdle({ lastOutputAt: session.lastOutputAt, now, idleThresholdMs })) {
        this.setActivityState(session, "idle", session.webContents);
      }
    }
  }

  private updateActivityState(session: TerminalSession, webContents: WebContents): void {
    const waiting = detectWaitingForInput(session.outputTail);
    this.setActivityState(session, waiting ? "waiting_for_input" : "busy", webContents);
  }

  private setActivityState(
    session: TerminalSession,
    state: TerminalActivityState,
    webContents: WebContents
  ): void {
    if (session.activityState === state) {
      return;
    }

    session.activityState = state;

    if (!webContents.isDestroyed()) {
      const event: TerminalActivityEvent = { id: session.id, state };
      webContents.send("terminal:activity", event);
    }
  }

  private syncTaskStatusAfterExit(session: TerminalSession | undefined, exitCode: number): void {
    if (!session?.taskId) {
      return;
    }

    const task = getTaskById(session.taskId);

    if (!task || task.status !== "running") {
      return;
    }

    setTaskStatus({
      projectId: session.projectId,
      id: session.taskId,
      status: resolveTaskStatusAfterExit(exitCode)
    });
  }

  private getOwnedSession(id: string, webContentsId: number): TerminalSession {
    const session = this.sessions.get(id);

    if (!session || session.ownerWebContentsId !== webContentsId) {
      throw new Error("Terminal session was not found.");
    }

    return session;
  }
}
