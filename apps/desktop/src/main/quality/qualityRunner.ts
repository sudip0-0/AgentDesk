import { spawn } from "node:child_process";
import type { RunQualityChecksInput, QualityCheckRecord } from "../../shared/qualityTypes.js";
import { getProjectById } from "../db/repositories/projectRepository.js";
import {
  listQualityCommands,
  saveQualityCheck
} from "../db/repositories/qualityRepository.js";
import { assertRunBelongsToProject } from "../db/repositories/agentRunRepository.js";
import { assertTaskBelongsToProject } from "../db/repositories/taskRepository.js";
import { redactSecrets } from "../terminal/logRedaction.js";

const MAX_OUTPUT_LENGTH = 120_000;

const truncateOutput = (output: string): string =>
  output.length > MAX_OUTPUT_LENGTH
    ? `${output.slice(0, MAX_OUTPUT_LENGTH)}\n[AgentDesk truncated output at ${MAX_OUTPUT_LENGTH} characters]`
    : output;

const runCommand = async (input: {
  command: string;
  cwd: string;
  timeoutMs: number | null;
}): Promise<{
  output: string;
  exitCode: number | null;
  timedOut: boolean;
}> =>
  new Promise((resolve) => {
    let output = "";
    let settled = false;
    const child = spawn(input.command, {
      cwd: input.cwd,
      shell: true,
      windowsHide: true
    });
    const timeout =
      input.timeoutMs === null
        ? null
        : setTimeout(() => {
            if (settled) {
              return;
            }

            settled = true;
            output += `\n[AgentDesk timed out after ${input.timeoutMs}ms]`;
            child.kill();
            resolve({
              output: truncateOutput(redactSecrets(output)),
              exitCode: null,
              timedOut: true
            });
          }, input.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }

      output += `\n[AgentDesk failed to start command: ${error.message}]`;
      resolve({
        output: truncateOutput(redactSecrets(output)),
        exitCode: null,
        timedOut: false
      });
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }

      resolve({
        output: truncateOutput(redactSecrets(output)),
        exitCode: code,
        timedOut: false
      });
    });
  });

export const runQualityChecks = async (
  input: RunQualityChecksInput
): Promise<QualityCheckRecord[]> => {
  const project = getProjectById(input.projectId);

  if (!project) {
    throw new Error("Project was not found.");
  }

  if (input.taskId) {
    assertTaskBelongsToProject(input.taskId, input.projectId);
  }

  if (input.agentRunId) {
    assertRunBelongsToProject(input.agentRunId, input.projectId);
  }

  const commands = listQualityCommands(input.projectId);
  const results: QualityCheckRecord[] = [];

  for (const command of commands) {
    const startedAt = new Date().toISOString();

    if (!command.command.trim()) {
      results.push(
        saveQualityCheck({
          projectId: input.projectId,
          taskId: input.taskId,
          agentRunId: input.agentRunId,
          label: command.label,
          command: command.command,
          status: "skipped",
          output: "Command is empty.",
          exitCode: null,
          startedAt,
          finishedAt: new Date().toISOString()
        })
      );
      continue;
    }

    const result = await runCommand({
      command: command.command,
      cwd: project.path,
      timeoutMs: command.timeoutMs
    });
    const succeeded = result.exitCode === 0 && !result.timedOut;
    let status: QualityCheckRecord["status"];
    let output = result.output;

    if (succeeded) {
      status = "passed";
    } else if (command.required) {
      status = "failed";
    } else {
      status = "skipped";
      output = `${output}\n[Optional check failed and was marked as skipped.]`;
    }

    results.push(
      saveQualityCheck({
        projectId: input.projectId,
        taskId: input.taskId,
        agentRunId: input.agentRunId,
        label: command.label,
        command: command.command,
        status,
        output,
        exitCode: result.exitCode,
        startedAt,
        finishedAt: new Date().toISOString()
      })
    );
  }

  return results;
};
