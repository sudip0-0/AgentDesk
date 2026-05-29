import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "../client.js";
import { agentRuns, tasks } from "../schema.js";

export type AgentRunStatus = "running" | "completed" | "failed" | "killed";

export interface StartAgentRunInput {
  projectId: string;
  terminalSessionId: string;
  command: string;
  cwd: string;
  taskId?: string;
  agentProfileId?: string;
  prompt?: string;
}

export const startAgentRun = (input: StartAgentRunInput): string => {
  const database = getDatabase();
  const id = randomUUID();
  const startedAt = new Date().toISOString();

  database.insert(agentRuns).values({
    id,
    projectId: input.projectId,
    taskId: input.taskId ?? null,
    agentProfileId: input.agentProfileId ?? null,
    terminalSessionId: input.terminalSessionId,
    command: input.command,
    prompt: input.prompt ?? null,
    status: "running",
    startedAt,
    summary: input.taskId ? `task run · cwd: ${input.cwd}` : `cwd: ${input.cwd}`
  }).run();

  return id;
};

export const finishAgentRun = (
  runId: string,
  status: Exclude<AgentRunStatus, "running">,
  exitCode?: number,
  errorMessage?: string
): void => {
  const database = getDatabase();

  database
    .update(agentRuns)
    .set({
      status,
      finishedAt: new Date().toISOString(),
      exitCode: exitCode ?? null,
      ...(errorMessage ? { errorMessage } : {})
    })
    .where(eq(agentRuns.id, runId))
    .run();
};

/**
 * Marks runs left in `running` state (for example after a crash or force quit)
 * as failed, and resets their linked still-running tasks back to `ready` so the
 * UI never shows a permanently stuck run. Returns the number of runs reconciled.
 */
export const reconcileInterruptedRuns = (): number => {
  const database = getDatabase();
  const stale = database
    .select({ id: agentRuns.id, taskId: agentRuns.taskId })
    .from(agentRuns)
    .where(eq(agentRuns.status, "running"))
    .all();

  if (stale.length === 0) {
    return 0;
  }

  const finishedAt = new Date().toISOString();

  for (const run of stale) {
    database
      .update(agentRuns)
      .set({
        status: "failed",
        finishedAt,
        errorMessage: "Run was interrupted (app closed or crashed before the process exited)."
      })
      .where(eq(agentRuns.id, run.id))
      .run();

    if (run.taskId) {
      database
        .update(tasks)
        .set({ status: "ready", updatedAt: finishedAt })
        .where(and(eq(tasks.id, run.taskId), eq(tasks.status, "running")))
        .run();
    }
  }

  return stale.length;
};

export const getAgentRun = (runId: string) => {
  const database = getDatabase();
  return database.select().from(agentRuns).where(eq(agentRuns.id, runId)).get();
};

export const assertRunBelongsToProject = (runId: string, projectId: string): void => {
  const run = getAgentRun(runId);

  if (!run || run.projectId !== projectId) {
    throw new Error("Agent run was not found for this project.");
  }
};
