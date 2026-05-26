import type {
  AgentCommandPreview,
  AgentProfileRecord,
  AgentPromptDelivery
} from "./agentProfileTypes.js";
import type { ProjectSummary } from "./projectTypes.js";
import type { TaskRecord } from "./taskTypes.js";

export const parseEnvText = (envText: string): Record<string, string> => {
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

  return env;
};

export const formatEnvText = (env: Record<string, string>): string =>
  Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

const applyTemplate = (
  value: string,
  context: { project: ProjectSummary; task: TaskRecord; prompt: string }
): string =>
  value
    .split("{{prompt}}").join(context.prompt)
    .split("{{task.id}}").join(context.task.id)
    .split("{{task.title}}").join(context.task.title)
    .split("{{project.name}}").join(context.project.name)
    .split("{{project.path}}").join(context.project.path);

export const splitArgs = (argsTemplate: string): string[] => {
  const args: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (const char of argsTemplate) {
    if ((char === '"' || char === "'") && quote === null) {
      quote = char;
      continue;
    }

    if (char === quote) {
      quote = null;
      continue;
    }

    if (/\s/.test(char) && quote === null) {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    args.push(current);
  }

  return args;
};

const quoteCommandPart = (part: string): string =>
  /\s/.test(part) ? `"${part.split('"').join('\\"')}"` : part;

const resolvePromptDelivery = (profile: AgentProfileRecord): AgentPromptDelivery => {
  if (profile.mode === "one_shot" && profile.promptDelivery === "manual") {
    return "argument";
  }

  return profile.promptDelivery;
};

export const buildAgentCommandPreview = (
  profile: AgentProfileRecord,
  context: {
    project: ProjectSummary;
    task: TaskRecord;
    prompt: string;
    cwd: string;
  }
): AgentCommandPreview => {
  const promptDelivery = resolvePromptDelivery(profile);
  const templatedArgs = splitArgs(applyTemplate(profile.argsTemplate, context));
  const args =
    promptDelivery === "argument" && !profile.argsTemplate.includes("{{prompt}}")
      ? [...templatedArgs, context.prompt]
      : templatedArgs;

  return {
    executable: profile.command,
    args,
    displayCommand: [profile.command, ...args].map(quoteCommandPart).join(" "),
    cwd: context.cwd,
    env: parseEnvText(profile.envText),
    promptDelivery,
    promptWillBeSentToStdin: promptDelivery === "send_to_stdin"
  };
};
