import { and, desc, eq, sql } from "drizzle-orm";
import type {
  AgentRunSummary,
  NextTaskSummary,
  ProjectOverview,
  TaskStatusSummary
} from "../../../shared/projectTypes.js";
import { taskStatuses, type TaskStatus } from "../../../shared/taskTypes.js";
import { getProjectWithFreshMetadata } from "./projectRepository.js";
import { getDatabase } from "../client.js";
import { agentRuns, tasks } from "../schema.js";

const emptyTaskSummary = (): TaskStatusSummary => ({
  backlog: 0,
  ready: 0,
  running: 0,
  needs_review: 0,
  failed: 0,
  blocked: 0,
  done: 0,
  total: 0
});

const buildTaskSummary = (projectId: string): TaskStatusSummary => {
  const database = getDatabase();
  const rows = database
    .select({
      status: tasks.status,
      count: sql<number>`count(*)`
    })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .groupBy(tasks.status)
    .all();

  const summary = emptyTaskSummary();

  for (const row of rows) {
    const status = row.status as TaskStatus;
    const count = Number(row.count);

    if ((taskStatuses as readonly string[]).includes(status)) {
      summary[status] = count;
      summary.total += count;
    }
  }

  return summary;
};

const listRecentRuns = (projectId: string, limit = 5): AgentRunSummary[] => {
  const database = getDatabase();

  return database
    .select({
      id: agentRuns.id,
      command: agentRuns.command,
      status: agentRuns.status,
      startedAt: agentRuns.startedAt,
      finishedAt: agentRuns.finishedAt,
      exitCode: agentRuns.exitCode,
      summary: agentRuns.summary,
      taskId: agentRuns.taskId,
      taskTitle: tasks.title
    })
    .from(agentRuns)
    .leftJoin(tasks, eq(agentRuns.taskId, tasks.id))
    .where(eq(agentRuns.projectId, projectId))
    .orderBy(desc(agentRuns.startedAt))
    .limit(limit)
    .all()
    .map((run) => ({
      id: run.id,
      command: run.command,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      exitCode: run.exitCode,
      summary: run.summary,
      taskId: run.taskId ?? null,
      taskTitle: run.taskTitle ?? null
    }));
};

const findNextTask = (projectId: string): NextTaskSummary | null => {
  const database = getDatabase();
  const readyTask = database
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status
    })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, "ready")))
    .orderBy(desc(tasks.updatedAt))
    .limit(1)
    .get();

  if (readyTask) {
    return {
      id: readyTask.id,
      title: readyTask.title,
      status: readyTask.status as TaskStatus
    };
  }

  const backlogTask = database
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status
    })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, "backlog")))
    .orderBy(desc(tasks.updatedAt))
    .limit(1)
    .get();

  if (backlogTask) {
    return {
      id: backlogTask.id,
      title: backlogTask.title,
      status: backlogTask.status as TaskStatus
    };
  }

  return null;
};

export const getProjectOverview = (projectId: string): ProjectOverview => {
  const project = getProjectWithFreshMetadata(projectId);

  if (!project) {
    throw new Error("Project was not found.");
  }

  return {
    project,
    taskSummary: buildTaskSummary(projectId),
    recentRuns: listRecentRuns(projectId),
    nextTask: findNextTask(projectId)
  };
};
