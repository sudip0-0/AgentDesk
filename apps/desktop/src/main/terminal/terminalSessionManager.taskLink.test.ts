import type { WebContents } from "electron";
import { describe, expect, it, vi } from "vitest";
import type { TerminalLogWriter } from "../db/terminalLogWriter.js";
import { TerminalSessionManager } from "./terminalSessionManager.js";

const taskId = "770e8400-e29b-41d4-a716-446655440000";
const projectId = "550e8400-e29b-41d4-a716-446655440000";

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

import { setTaskStatus } from "../db/repositories/taskRepository.js";

describe("TerminalSessionManager task linking", () => {
  it("stores task id and prompt when creating a task-linked session", () => {
    const logWriter = {
      startSession: vi.fn(() => "run-linked"),
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
      id: 1,
      isDestroyed: () => false,
      send: vi.fn()
    } as unknown as WebContents;

    manager.create(
      { projectId, taskId, cwd: process.cwd(), cols: 80, rows: 24 },
      webContents
    );

    expect(setTaskStatus).toHaveBeenCalledWith({
      projectId,
      id: taskId,
      status: "running"
    });
    expect(logWriter.startSession).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        taskId,
        prompt: expect.stringContaining("Linked task")
      })
    );

    manager.killForWebContents(1);
  });
});
