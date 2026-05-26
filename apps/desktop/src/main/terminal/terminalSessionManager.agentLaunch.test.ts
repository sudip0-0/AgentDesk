import type { WebContents } from "electron";
import { describe, expect, it, vi } from "vitest";
import type { TerminalLogWriter } from "../db/terminalLogWriter.js";
import { TerminalSessionManager } from "./terminalSessionManager.js";

const taskId = "770e8400-e29b-41d4-a716-446655440000";
const projectId = "550e8400-e29b-41d4-a716-446655440000";
const profileId = "660e8400-e29b-41d4-a716-446655440002";

vi.mock("../db/repositories/taskRepository.js", () => ({
  assertTaskBelongsToProject: vi.fn(),
  getTaskById: vi.fn(() => ({
    id: taskId,
    projectId,
    title: "Linked task",
    description: "",
    status: "ready",
    priority: "medium",
    goal: "Test goal",
    context: "",
    acceptanceCriteria: "",
    filesLikelyAffected: "",
    qualityCommands: "",
    securityNotes: "",
    doneDefinition: "",
    dependsOn: "",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString()
  })),
  setTaskStatus: vi.fn()
}));

vi.mock("../db/repositories/agentProfileRepository.js", () => ({
  getAgentProfileById: vi.fn(() => ({
    id: profileId,
    name: "Test Agent",
    command: "codex",
    argsTemplate: "",
    shell: "powershell",
    mode: "interactive",
    envText: "",
    workingDirectoryBehavior: "project_root",
    promptDelivery: "manual",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString()
  }))
}));

describe("TerminalSessionManager agent launch", () => {
  it("rejects agent profile launch without a task id", () => {
    const manager = new TerminalSessionManager(
      {
        startSession: vi.fn(),
        appendOutput: vi.fn(),
        endSession: vi.fn(),
        flushAll: vi.fn()
      } as unknown as TerminalLogWriter,
      () => ({
        id: projectId,
        name: "AgentDesk",
        path: process.cwd(),
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        metadata: {
          hasPackageJson: true,
          packageManager: "npm",
          scripts: [],
          isGitRepo: false,
          currentBranch: null
        }
      })
    );

    const webContents = {
      id: 1,
      isDestroyed: () => false,
      send: vi.fn()
    } as unknown as WebContents;

    expect(() =>
      manager.create(
        { projectId, agentProfileId: profileId, cwd: process.cwd(), cols: 80, rows: 24 },
        webContents
      )
    ).toThrow(/linked task/i);
  });

  it("stores agent profile metadata and shell-wrapped command when launching", () => {
    const logWriter = {
      startSession: vi.fn(() => "run-agent"),
      appendOutput: vi.fn(),
      endSession: vi.fn(),
      flushAll: vi.fn()
    } as unknown as TerminalLogWriter;

    const manager = new TerminalSessionManager(logWriter, () => ({
      id: projectId,
      name: "AgentDesk",
      path: process.cwd(),
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      metadata: {
        hasPackageJson: true,
        packageManager: "npm",
        scripts: [],
        isGitRepo: false,
        currentBranch: null
      }
    }));

    const webContents = {
      id: 2,
      isDestroyed: () => false,
      send: vi.fn()
    } as unknown as WebContents;

    const session = manager.create(
      {
        projectId,
        taskId,
        agentProfileId: profileId,
        cwd: process.cwd(),
        cols: 80,
        rows: 24
      },
      webContents
    );

    expect(logWriter.startSession).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        taskId,
        agentProfileId: profileId,
        command: expect.stringMatching(/powershell\.exe/i)
      })
    );

    manager.kill(session.id, webContents);
  });
});
