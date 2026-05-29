import { desc, eq } from "drizzle-orm";
import type { AgentProfileMode } from "../../shared/agentProfileTypes.js";
import type { AgentRunDetail, AgentRunListItem } from "../../shared/runDetailTypes.js";
import type { QualityCheckRecord, QualityCheckStatus } from "../../shared/qualityTypes.js";
import type { TaskRecord, TaskStatus } from "../../shared/taskTypes.js";
import { getGitStatus } from "../git/gitRunner.js";
import { getDatabase } from "../db/client.js";
import { agentProfiles, agentRuns, qualityChecks, tasks } from "../db/schema.js";
import { getProjectById } from "../db/repositories/projectRepository.js";
import {
  buildTranscript,
  getTerminalLogMeta
} from "../db/repositories/terminalLogRepository.js";

const MAX_TRANSCRIPT_LENGTH = 120_000;

const durationMs = (startedAt: string, finishedAt: string | null): number | null => {
  if (!finishedAt) {
    return null;
  }

  const started = Date.parse(startedAt);
  const finished = Date.parse(finishedAt);

  return Number.isFinite(started) && Number.isFinite(finished) ? Math.max(0, finished - started) : null;
};

const cleanText = (value: string | null): string => value ?? "";

const toTaskRecord = (task: typeof tasks.$inferSelect): TaskRecord => ({
  id: task.id,
  projectId: task.projectId,
  title: task.title,
  description: cleanText(task.description),
  status: task.status as TaskStatus,
  priority: task.priority === "high" || task.priority === "low" ? task.priority : "medium",
  goal: cleanText(task.goal),
  context: cleanText(task.context),
  acceptanceCriteria: cleanText(task.acceptanceCriteria),
  filesLikelyAffected: cleanText(task.filesLikelyAffected),
  qualityCommands: cleanText(task.qualityCommands),
  securityNotes: cleanText(task.securityNotes),
  doneDefinition: cleanText(task.doneDefinition),
  dependsOn: cleanText(task.dependsOn),
  createdAt: task.createdAt,
  updatedAt: task.updatedAt
});

const toQualityCheckRecord = (check: typeof qualityChecks.$inferSelect): QualityCheckRecord => ({
  id: check.id,
  agentRunId: check.agentRunId,
  projectId: check.projectId,
  taskId: check.taskId,
  label: check.label,
  command: check.command,
  status: check.status as QualityCheckStatus,
  output: check.output ?? "",
  exitCode: check.exitCode,
  startedAt: check.startedAt,
  finishedAt: check.finishedAt
});

export const listAgentRuns = (projectId: string): AgentRunListItem[] => {
  if (!getProjectById(projectId)) {
    throw new Error("Project was not found.");
  }

  const database = getDatabase();

  return database
    .select({
      id: agentRuns.id,
      projectId: agentRuns.projectId,
      taskId: agentRuns.taskId,
      taskTitle: tasks.title,
      agentProfileId: agentRuns.agentProfileId,
      agentName: agentProfiles.name,
      command: agentRuns.command,
      status: agentRuns.status,
      startedAt: agentRuns.startedAt,
      finishedAt: agentRuns.finishedAt,
      exitCode: agentRuns.exitCode
    })
    .from(agentRuns)
    .leftJoin(tasks, eq(agentRuns.taskId, tasks.id))
    .leftJoin(agentProfiles, eq(agentRuns.agentProfileId, agentProfiles.id))
    .where(eq(agentRuns.projectId, projectId))
    .orderBy(desc(agentRuns.startedAt))
    .limit(100)
    .all()
    .map((run) => ({
      id: run.id,
      projectId: run.projectId,
      taskId: run.taskId ?? null,
      taskTitle: run.taskTitle ?? null,
      agentProfileId: run.agentProfileId ?? null,
      agentName: run.agentName ?? null,
      command: run.command,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      exitCode: run.exitCode,
      durationMs: durationMs(run.startedAt, run.finishedAt)
    }));
};

export const getAgentRunDetail = async (
  projectId: string,
  runId: string
): Promise<AgentRunDetail> => {
  if (!getProjectById(projectId)) {
    throw new Error("Project was not found.");
  }

  const database = getDatabase();
  const run = database
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.id, runId))
    .get();

  if (!run || run.projectId !== projectId) {
    throw new Error("Agent run was not found for this project.");
  }

  const task = run.taskId
    ? database.select().from(tasks).where(eq(tasks.id, run.taskId)).get()
    : null;
  const agent = run.agentProfileId
    ? database.select().from(agentProfiles).where(eq(agentProfiles.id, run.agentProfileId)).get()
    : null;
  const qualityResults = database
    .select()
    .from(qualityChecks)
    .where(eq(qualityChecks.agentRunId, runId))
    .orderBy(desc(qualityChecks.startedAt))
    .limit(50)
    .all()
    .map(toQualityCheckRecord);
  const fullTranscript = buildTranscript(runId);
  const transcriptTruncated = fullTranscript.length > MAX_TRANSCRIPT_LENGTH;
  const status = await getGitStatus(projectId).catch(() => ({
    files: []
  }));

  return {
    id: run.id,
    projectId: run.projectId,
    command: run.command,
    prompt: run.prompt,
    status: run.status,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    exitCode: run.exitCode,
    durationMs: durationMs(run.startedAt, run.finishedAt),
    notes: run.summary ?? null,
    errorMessage: run.errorMessage ?? null,
    task: task ? toTaskRecord(task) : null,
    agent: agent
      ? {
          id: agent.id,
          name: agent.name,
          mode: agent.mode as AgentProfileMode,
          command: agent.command
        }
      : null,
    transcript: transcriptTruncated ? fullTranscript.slice(0, MAX_TRANSCRIPT_LENGTH) : fullTranscript,
    transcriptTruncated,
    logMeta: getTerminalLogMeta(runId),
    changedFiles: status.files,
    qualityResults
  };
};
