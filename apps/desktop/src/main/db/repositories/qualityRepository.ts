import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type {
  CreateFixTaskInput,
  ListQualityChecksInput,
  QualityCheckRecord,
  QualityCheckStatus,
  QualityCommandInput,
  QualityCommandRecord,
  QualityCommandUpdateInput
} from "../../../shared/qualityTypes.js";
import { qualityCommandDefaults } from "../../../shared/qualityTypes.js";
import { assertRunBelongsToProject } from "./agentRunRepository.js";
import { assertTaskBelongsToProject, createTask } from "./taskRepository.js";
import { getDatabase } from "../client.js";
import { qualityChecks, qualityCommands } from "../schema.js";

const toCommandRecord = (command: typeof qualityCommands.$inferSelect): QualityCommandRecord => ({
  id: command.id,
  projectId: command.projectId,
  label: command.label,
  command: command.command,
  required: command.required === 1,
  timeoutMs: command.timeoutMs,
  createdAt: command.createdAt,
  updatedAt: command.updatedAt
});

const toCheckRecord = (check: typeof qualityChecks.$inferSelect): QualityCheckRecord => ({
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

export const ensureDefaultQualityCommands = (projectId: string): void => {
  const database = getDatabase();
  const existing = database
    .select({ id: qualityCommands.id })
    .from(qualityCommands)
    .where(eq(qualityCommands.projectId, projectId))
    .limit(1)
    .get();

  if (existing) {
    return;
  }

  const now = new Date().toISOString();

  for (const defaultCommand of qualityCommandDefaults) {
    database.insert(qualityCommands).values({
      id: randomUUID(),
      projectId,
      label: defaultCommand.label,
      command: defaultCommand.command,
      required: defaultCommand.required ? 1 : 0,
      timeoutMs: defaultCommand.timeoutMs,
      createdAt: now,
      updatedAt: now
    }).run();
  }
};

export const listQualityCommands = (projectId: string): QualityCommandRecord[] => {
  ensureDefaultQualityCommands(projectId);
  const database = getDatabase();

  return database
    .select()
    .from(qualityCommands)
    .where(eq(qualityCommands.projectId, projectId))
    .all()
    .map(toCommandRecord);
};

export const createQualityCommand = (input: QualityCommandInput): QualityCommandRecord => {
  const database = getDatabase();
  const now = new Date().toISOString();
  const command = {
    id: randomUUID(),
    projectId: input.projectId,
    label: input.label.trim(),
    command: input.command.trim(),
    required: input.required ? 1 : 0,
    timeoutMs: input.timeoutMs,
    createdAt: now,
    updatedAt: now
  };

  database.insert(qualityCommands).values(command).run();

  return toCommandRecord(command);
};

export const updateQualityCommand = (input: QualityCommandUpdateInput): QualityCommandRecord => {
  const database = getDatabase();

  database
    .update(qualityCommands)
    .set({
      label: input.label.trim(),
      command: input.command.trim(),
      required: input.required ? 1 : 0,
      timeoutMs: input.timeoutMs,
      updatedAt: new Date().toISOString()
    })
    .where(and(eq(qualityCommands.id, input.id), eq(qualityCommands.projectId, input.projectId)))
    .run();

  const command = database
    .select()
    .from(qualityCommands)
    .where(and(eq(qualityCommands.id, input.id), eq(qualityCommands.projectId, input.projectId)))
    .get();

  if (!command) {
    throw new Error("Quality command was not found for this project.");
  }

  return toCommandRecord(command);
};

export const deleteQualityCommand = (projectId: string, id: string): void => {
  const database = getDatabase();
  const result = database
    .delete(qualityCommands)
    .where(and(eq(qualityCommands.id, id), eq(qualityCommands.projectId, projectId)))
    .run();

  if (result.changes === 0) {
    throw new Error("Quality command was not found for this project.");
  }
};

export const saveQualityCheck = (input: {
  projectId: string;
  taskId?: string;
  agentRunId?: string;
  label: string;
  command: string;
  status: QualityCheckStatus;
  output: string;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string;
}): QualityCheckRecord => {
  if (input.taskId) {
    assertTaskBelongsToProject(input.taskId, input.projectId);
  }

  if (input.agentRunId) {
    assertRunBelongsToProject(input.agentRunId, input.projectId);
  }

  const database = getDatabase();
  const check = {
    id: randomUUID(),
    agentRunId: input.agentRunId ?? null,
    projectId: input.projectId,
    taskId: input.taskId ?? null,
    label: input.label,
    command: input.command,
    status: input.status,
    output: input.output,
    exitCode: input.exitCode,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt
  };

  database.insert(qualityChecks).values(check).run();

  return toCheckRecord(check);
};

export const listQualityChecks = (input: ListQualityChecksInput): QualityCheckRecord[] => {
  const database = getDatabase();
  const filters = [eq(qualityChecks.projectId, input.projectId)];

  if (input.taskId) {
    filters.push(eq(qualityChecks.taskId, input.taskId));
  }

  if (input.agentRunId) {
    filters.push(eq(qualityChecks.agentRunId, input.agentRunId));
  }

  return database
    .select()
    .from(qualityChecks)
    .where(and(...filters))
    .orderBy(desc(qualityChecks.startedAt))
    .limit(50)
    .all()
    .map(toCheckRecord);
};

export const createFixTaskFromQualityCheck = (input: CreateFixTaskInput) => {
  const database = getDatabase();
  const check = database
    .select()
    .from(qualityChecks)
    .where(and(eq(qualityChecks.id, input.qualityCheckId), eq(qualityChecks.projectId, input.projectId)))
    .get();

  if (!check) {
    throw new Error("Quality check was not found for this project.");
  }

  if (check.status !== "failed") {
    throw new Error("Only failed checks can create fix tasks.");
  }

  return createTask({
    projectId: input.projectId,
    title: `Fix quality check: ${check.label}`,
    description: `Resolve failed command: ${check.command}`,
    status: "backlog",
    priority: "high",
    goal: `Make the "${check.label}" quality check pass.`,
    context: `Failed command output:\n\n${check.output ?? ""}`,
    acceptanceCriteria: `The command "${check.command}" completes successfully.`,
    filesLikelyAffected: "",
    qualityCommands: check.command,
    securityNotes: "Preserve existing safety confirmations and Electron security boundaries.",
    doneDefinition: "The failed quality check passes and any related checks are reported honestly.",
    dependsOn: check.taskId ?? ""
  });
};
