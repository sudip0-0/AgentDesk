import type {
  AgentCommandPreview,
  AgentLaunchConfig,
  AgentProfileRecord,
  AgentPromptDelivery
} from "./agentProfileTypes.js";
import type { ProjectSummary } from "./projectTypes.js";
import type { TaskRecord } from "./taskTypes.js";
import type { TerminalShell } from "./terminalTypes.js";

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

const quotePowerShellArg = (part: string): string => `'${part.split("'").join("''")}'`;

const formatArgvCommand = (executable: string, args: string[]): string =>
  [executable, ...args].map(quoteCommandPart).join(" ");

export const resolveShellExecutable = (
  shell: TerminalShell,
  platform = process.platform
): string => {
  if (platform !== "win32") {
    return process.env.SHELL ?? "/bin/sh";
  }

  if (shell === "cmd") {
    return process.env.ComSpec ?? "cmd.exe";
  }

  return "powershell.exe";
};

/** Wraps an agent executable and args so the PTY runs inside the profile shell. */
export const wrapAgentCommandForShell = (
  shell: TerminalShell,
  executable: string,
  args: string[],
  platform = process.platform
): { executable: string; args: string[] } => {
  if (platform !== "win32") {
    const shellExecutable = resolveShellExecutable(shell, platform);
    return { executable: shellExecutable, args: ["-c", formatArgvCommand(executable, args)] };
  }

  const shellExecutable = resolveShellExecutable(shell, platform);

  if (shell === "cmd") {
    return {
      executable: shellExecutable,
      args: ["/c", formatArgvCommand(executable, args)]
    };
  }

  const invocation = `& ${quotePowerShellArg(executable)} ${args.map(quotePowerShellArg).join(" ")}`.trim();

  return {
    executable: shellExecutable,
    args: ["-NoLogo", "-Command", invocation]
  };
};

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
    displayCommand: formatArgvCommand(profile.command, args),
    cwd: context.cwd,
    env: parseEnvText(profile.envText),
    promptDelivery,
    promptWillBeSentToStdin: promptDelivery === "send_to_stdin"
  };
};

export const buildAgentLaunchConfig = (
  profile: AgentProfileRecord,
  context: {
    project: ProjectSummary;
    task: TaskRecord;
    prompt: string;
    cwd: string;
  },
  platform = process.platform
): AgentLaunchConfig => {
  const preview = buildAgentCommandPreview(profile, context);
  const wrapped = wrapAgentCommandForShell(profile.shell, preview.executable, preview.args, platform);

  return {
    ...preview,
    spawnExecutable: wrapped.executable,
    spawnArgs: wrapped.args,
    displayCommand: formatArgvCommand(wrapped.executable, wrapped.args)
  };
};
