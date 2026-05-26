import type { TerminalShell } from "./terminalTypes.js";

export const agentProfileModes = ["interactive", "one_shot"] as const;
export type AgentProfileMode = (typeof agentProfileModes)[number];

export const agentWorkingDirectoryBehaviors = ["project_root", "terminal_cwd"] as const;
export type AgentWorkingDirectoryBehavior = (typeof agentWorkingDirectoryBehaviors)[number];

export const agentPromptDeliveries = ["manual", "send_to_stdin", "argument"] as const;
export type AgentPromptDelivery = (typeof agentPromptDeliveries)[number];

export interface AgentProfileRecord {
  id: string;
  name: string;
  command: string;
  argsTemplate: string;
  shell: TerminalShell;
  mode: AgentProfileMode;
  envText: string;
  workingDirectoryBehavior: AgentWorkingDirectoryBehavior;
  promptDelivery: AgentPromptDelivery;
  createdAt: string;
  updatedAt: string;
}

export interface AgentProfileInput {
  name: string;
  command: string;
  argsTemplate: string;
  shell: TerminalShell;
  mode: AgentProfileMode;
  envText: string;
  workingDirectoryBehavior: AgentWorkingDirectoryBehavior;
  promptDelivery: AgentPromptDelivery;
}

export interface AgentProfileUpdateInput extends AgentProfileInput {
  id: string;
}

export interface AgentProfileDeleteInput {
  id: string;
}

export interface AgentCommandPreviewRequest {
  profileId: string;
  projectId: string;
  taskId: string;
  prompt: string;
  cwd?: string;
}

export interface AgentCommandPreview {
  executable: string;
  args: string[];
  displayCommand: string;
  cwd: string;
  env: Record<string, string>;
  promptDelivery: AgentPromptDelivery;
  promptWillBeSentToStdin: boolean;
}

/** Resolved PTY spawn target after applying the profile shell wrapper. */
export interface AgentLaunchConfig extends AgentCommandPreview {
  spawnExecutable: string;
  spawnArgs: string[];
}
