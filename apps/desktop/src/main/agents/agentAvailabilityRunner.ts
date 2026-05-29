import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import {
  buildExecutableCandidates,
  versionProbeArgs,
  type AgentAvailability,
  type AgentCommandTestResult
} from "../../shared/agentAvailability.js";
import { redactSecrets } from "../terminal/logRedaction.js";
import {
  getAgentProfileById,
  listAgentProfiles
} from "../db/repositories/agentProfileRepository.js";

const MAX_TEST_OUTPUT = 4_000;
const TEST_TIMEOUT_MS = 8_000;

const resolveExecutablePath = (command: string): string | null => {
  const candidates = buildExecutableCandidates(command, {
    path: process.env.PATH ?? process.env.Path,
    pathExt: process.env.PATHEXT
  });

  for (const candidate of candidates) {
    try {
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // Ignore unreadable candidates and keep probing.
    }
  }

  return null;
};

const buildAvailability = (profileId: string, command: string): AgentAvailability => {
  const resolvedPath = resolveExecutablePath(command);

  return {
    profileId,
    command,
    installed: resolvedPath !== null,
    resolvedPath,
    message: resolvedPath
      ? `Found at ${resolvedPath}`
      : `"${command}" was not found on PATH.`
  };
};

/** Resolves install state for every saved agent profile. */
export const detectAgentAvailability = (): AgentAvailability[] =>
  listAgentProfiles().map((profile) => buildAvailability(profile.id, profile.command));

/**
 * Runs the agent command with a version probe to confirm it actually executes.
 * Spawns the executable directly (no shell) to avoid command injection.
 */
export const testAgentCommand = async (profileId: string): Promise<AgentCommandTestResult> => {
  const profile = getAgentProfileById(profileId);

  if (!profile) {
    throw new Error("Agent profile was not found.");
  }

  const resolvedPath = resolveExecutablePath(profile.command);
  const startedAt = Date.now();

  if (!resolvedPath) {
    return {
      profileId,
      command: profile.command,
      installed: false,
      exitCode: null,
      output: "",
      durationMs: 0,
      message: `"${profile.command}" was not found on PATH. Install it or set the full path in the profile command.`
    };
  }

  return new Promise<AgentCommandTestResult>((resolve) => {
    let output = "";
    let settled = false;

    const finish = (result: Omit<AgentCommandTestResult, "profileId" | "command" | "durationMs">): void => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      resolve({
        profileId,
        command: profile.command,
        durationMs: Date.now() - startedAt,
        ...result
      });
    };

    const child = spawn(resolvedPath, versionProbeArgs, {
      shell: false,
      windowsHide: true
    });

    const timeout = setTimeout(() => {
      child.kill();
      finish({
        installed: true,
        exitCode: null,
        output: redactSecrets(output).slice(0, MAX_TEST_OUTPUT),
        message: `Command started but did not respond to ${versionProbeArgs.join(" ")} within ${TEST_TIMEOUT_MS}ms. It may be interactive.`
      });
    }, TEST_TIMEOUT_MS);

    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });

    child.on("error", (error) => {
      finish({
        installed: false,
        exitCode: null,
        output: redactSecrets(output).slice(0, MAX_TEST_OUTPUT),
        message: `Failed to start "${profile.command}": ${error.message}`
      });
    });

    child.on("close", (exitCode) => {
      finish({
        installed: true,
        exitCode,
        output: redactSecrets(output).slice(0, MAX_TEST_OUTPUT) || "(no output)",
        message:
          exitCode === 0
            ? `"${profile.command}" responded successfully.`
            : `"${profile.command}" is installed but exited with code ${exitCode ?? "unknown"}.`
      });
    });
  });
};
