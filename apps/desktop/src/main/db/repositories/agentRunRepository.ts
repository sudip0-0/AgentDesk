import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "../client.js";
import { agentRuns } from "../schema.js";

export type AgentRunStatus = "running" | "completed" | "failed" | "killed";

export interface StartAgentRunInput {
  projectId: string;
  terminalSessionId: string;
  command: string;
  cwd: string;
  taskId?: string;
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
  exitCode?: number
): void => {
  const database = getDatabase();

  database
    .update(agentRuns)
    .set({
      status,
      finishedAt: new Date().toISOString(),
      exitCode: exitCode ?? null
    })
    .where(eq(agentRuns.id, runId))
    .run();
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
