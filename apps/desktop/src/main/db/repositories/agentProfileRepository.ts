import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import type {
  AgentProfileInput,
  AgentProfileRecord,
  AgentProfileUpdateInput,
  AgentPromptDelivery,
  AgentProfileMode,
  AgentWorkingDirectoryBehavior
} from "../../../shared/agentProfileTypes.js";
import type { TerminalShell } from "../../../shared/terminalTypes.js";
import { getDatabase } from "../client.js";
import { agentProfiles, agentRuns } from "../schema.js";

export const DEFAULT_AGENT_PROFILE_IDS = {
  codex: "00000000-0000-4000-8000-000000000601",
  opencode: "00000000-0000-4000-8000-000000000602",
  kiro: "00000000-0000-4000-8000-000000000603",
  devin: "00000000-0000-4000-8000-000000000604",
  claude: "00000000-0000-4000-8000-000000000605",
  custom: "00000000-0000-4000-8000-000000000606"
} as const;

export const defaultAgentProfiles: Array<AgentProfileInput & { id: string }> = [
  {
    id: DEFAULT_AGENT_PROFILE_IDS.codex,
    name: "Codex",
    command: "codex",
    argsTemplate: "",
    shell: "powershell",
    mode: "interactive",
    envText: "",
    workingDirectoryBehavior: "project_root",
    promptDelivery: "send_to_stdin"
  },
  {
    id: DEFAULT_AGENT_PROFILE_IDS.opencode,
    name: "OpenCode",
    command: "opencode",
    argsTemplate: "",
    shell: "powershell",
    mode: "interactive",
    envText: "",
    workingDirectoryBehavior: "project_root",
    promptDelivery: "send_to_stdin"
  },
  {
    id: DEFAULT_AGENT_PROFILE_IDS.kiro,
    name: "Kiro CLI",
    command: "kiro",
    argsTemplate: "",
    shell: "powershell",
    mode: "interactive",
    envText: "",
    workingDirectoryBehavior: "project_root",
    promptDelivery: "send_to_stdin"
  },
  {
    id: DEFAULT_AGENT_PROFILE_IDS.devin,
    name: "Devin CLI",
    command: "devin",
    argsTemplate: "",
    shell: "powershell",
    mode: "interactive",
    envText: "",
    workingDirectoryBehavior: "project_root",
    promptDelivery: "send_to_stdin"
  },
  {
    id: DEFAULT_AGENT_PROFILE_IDS.claude,
    name: "Claude Code",
    command: "claude",
    argsTemplate: "",
    shell: "powershell",
    mode: "interactive",
    envText: "",
    workingDirectoryBehavior: "project_root",
    promptDelivery: "send_to_stdin"
  },
  {
    id: DEFAULT_AGENT_PROFILE_IDS.custom,
    name: "Custom Command",
    command: "powershell.exe",
    argsTemplate: "",
    shell: "powershell",
    mode: "interactive",
    envText: "",
    workingDirectoryBehavior: "project_root",
    promptDelivery: "manual"
  }
];

const parseEnvJson = (envJson: string | null): string => {
  if (!envJson) {
    return "";
  }

  try {
    const parsed = JSON.parse(envJson) as Record<string, string>;
    return Object.entries(parsed)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
  } catch {
    return "";
  }
};

const envTextToJson = (envText: string): string => {
  const env: Record<string, string> = {};

  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    env[line.slice(0, separatorIndex).trim()] = line.slice(separatorIndex + 1).trim();
  }

  return JSON.stringify(env);
};

const toAgentProfileRecord = (profile: typeof agentProfiles.$inferSelect): AgentProfileRecord => ({
  id: profile.id,
  name: profile.name,
  command: profile.command,
  argsTemplate: profile.argsTemplate ?? "",
  shell: profile.shell === "cmd" ? "cmd" : ("powershell" satisfies TerminalShell),
  mode: profile.mode === "one_shot" ? "one_shot" : ("interactive" satisfies AgentProfileMode),
  envText: parseEnvJson(profile.envJson),
  workingDirectoryBehavior:
    profile.workingDirectoryBehavior === "terminal_cwd"
      ? "terminal_cwd"
      : ("project_root" satisfies AgentWorkingDirectoryBehavior),
  promptDelivery:
    profile.promptDelivery === "manual" || profile.promptDelivery === "argument"
      ? (profile.promptDelivery as AgentPromptDelivery)
      : "send_to_stdin",
  createdAt: profile.createdAt,
  updatedAt: profile.updatedAt
});

export const ensureDefaultAgentProfiles = (): void => {
  const database = getDatabase();
  const now = new Date().toISOString();

  for (const profile of defaultAgentProfiles) {
    const existing = database
      .select({ id: agentProfiles.id })
      .from(agentProfiles)
      .where(eq(agentProfiles.id, profile.id))
      .get();

    if (existing) {
      continue;
    }

    database.insert(agentProfiles).values({
      id: profile.id,
      name: profile.name,
      command: profile.command,
      argsTemplate: profile.argsTemplate,
      mode: profile.mode,
      shell: profile.shell,
      envJson: envTextToJson(profile.envText),
      workingDirectoryBehavior: profile.workingDirectoryBehavior,
      promptDelivery: profile.promptDelivery,
      createdAt: now,
      updatedAt: now
    }).run();
  }
};

export const listAgentProfiles = (): AgentProfileRecord[] => {
  const database = getDatabase();

  return database
    .select()
    .from(agentProfiles)
    .orderBy(asc(agentProfiles.createdAt), asc(agentProfiles.name))
    .all()
    .map(toAgentProfileRecord);
};

export const getAgentProfileById = (profileId: string): AgentProfileRecord | null => {
  const database = getDatabase();
  const profile = database
    .select()
    .from(agentProfiles)
    .where(eq(agentProfiles.id, profileId))
    .get();

  return profile ? toAgentProfileRecord(profile) : null;
};

export const createAgentProfile = (input: AgentProfileInput): AgentProfileRecord => {
  const database = getDatabase();
  const now = new Date().toISOString();
  const profile = {
    id: randomUUID(),
    name: input.name.trim(),
    command: input.command.trim(),
    argsTemplate: input.argsTemplate,
    mode: input.mode,
    shell: input.shell,
    envJson: envTextToJson(input.envText),
    workingDirectoryBehavior: input.workingDirectoryBehavior,
    promptDelivery: input.promptDelivery,
    createdAt: now,
    updatedAt: now
  };

  database.insert(agentProfiles).values(profile).run();

  return toAgentProfileRecord(profile);
};

export const updateAgentProfile = (input: AgentProfileUpdateInput): AgentProfileRecord => {
  const database = getDatabase();

  database
    .update(agentProfiles)
    .set({
      name: input.name.trim(),
      command: input.command.trim(),
      argsTemplate: input.argsTemplate,
      mode: input.mode,
      shell: input.shell,
      envJson: envTextToJson(input.envText),
      workingDirectoryBehavior: input.workingDirectoryBehavior,
      promptDelivery: input.promptDelivery,
      updatedAt: new Date().toISOString()
    })
    .where(eq(agentProfiles.id, input.id))
    .run();

  const profile = getAgentProfileById(input.id);

  if (!profile) {
    throw new Error("Agent profile was not found.");
  }

  return profile;
};

export const deleteAgentProfile = (profileId: string): void => {
  const database = getDatabase();

  database
    .update(agentRuns)
    .set({ agentProfileId: null })
    .where(eq(agentRuns.agentProfileId, profileId))
    .run();

  const result = database.delete(agentProfiles).where(eq(agentProfiles.id, profileId)).run();

  if (result.changes === 0) {
    throw new Error("Agent profile was not found.");
  }
};
