import { describe, expect, it } from "vitest";
import {
  buildAgentCommandPreview,
  buildAgentLaunchConfig,
  parseEnvText,
  splitArgs,
  wrapAgentCommandForShell
} from "./agentCommandBuilder.js";
import type { AgentProfileRecord } from "./agentProfileTypes.js";
import type { ProjectSummary } from "./projectTypes.js";
import type { TaskRecord } from "./taskTypes.js";

const project: ProjectSummary = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "AgentDesk",
  path: "C:/Projects/AgentDesk",
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  metadata: {
    hasPackageJson: true,
    packageManager: "npm",
    scripts: [],
    isGitRepo: false,
    currentBranch: null
  }
};

const task: TaskRecord = {
  id: "770e8400-e29b-41d4-a716-446655440000",
  projectId: project.id,
  title: "Launch agent",
  description: "",
  status: "ready",
  priority: "medium",
  goal: "Run a task with a profile.",
  context: "",
  acceptanceCriteria: "Command is built.",
  filesLikelyAffected: "",
  qualityCommands: "npm test",
  securityNotes: "",
  doneDefinition: "",
  dependsOn: "",
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString()
};

const profile: AgentProfileRecord = {
  id: "00000000-0000-4000-8000-000000000601",
  name: "Codex",
  command: "codex",
  argsTemplate: "exec --task \"{{task.title}}\"",
  shell: "powershell",
  mode: "one_shot",
  envText: "OPENAI_BASE_URL=http://localhost:3000",
  workingDirectoryBehavior: "project_root",
  promptDelivery: "argument",
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString()
};

describe("agent command builder", () => {
  it("splits quoted args", () => {
    expect(splitArgs('exec --task "Launch agent"')).toEqual(["exec", "--task", "Launch agent"]);
  });

  it("parses environment variables", () => {
    expect(parseEnvText("FOO=bar\n# ignored\nBAZ=qux")).toEqual({
      FOO: "bar",
      BAZ: "qux"
    });
  });

  it("builds command preview with templated args and prompt delivery", () => {
    const preview = buildAgentCommandPreview(profile, {
      project,
      task,
      prompt: "Implement this task.",
      cwd: project.path
    });

    expect(preview.executable).toBe("codex");
    expect(preview.args).toEqual(["exec", "--task", "Launch agent", "Implement this task."]);
    expect(preview.displayCommand).toContain('"Launch agent"');
    expect(preview.env.OPENAI_BASE_URL).toBe("http://localhost:3000");
    expect(preview.promptWillBeSentToStdin).toBe(false);
  });

  it("wraps agent commands in the profile shell on Windows", () => {
    const wrapped = wrapAgentCommandForShell("powershell", "codex", ["exec", "--task", "Launch agent"], "win32");

    expect(wrapped.executable).toBe("powershell.exe");
    expect(wrapped.args[0]).toBe("-NoLogo");
    expect(wrapped.args[1]).toBe("-Command");
    expect(wrapped.args[2]).toContain("codex");
    expect(wrapped.args[2]).toContain("Launch agent");
  });

  it("builds launch config with shell-wrapped spawn target", () => {
    const launchConfig = buildAgentLaunchConfig(
      profile,
      {
        project,
        task,
        prompt: "Implement this task.",
        cwd: project.path
      },
      "win32"
    );

    expect(launchConfig.spawnExecutable).toBe("powershell.exe");
    expect(launchConfig.spawnArgs.length).toBeGreaterThan(0);
    expect(launchConfig.displayCommand).toContain("powershell.exe");
  });
});
