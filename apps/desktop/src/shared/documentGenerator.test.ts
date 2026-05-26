import { describe, expect, it } from "vitest";
import { buildDefaultDocumentMarkdown, buildProgressMarkdown } from "./documentGenerator.js";
import type { ProjectOverview } from "./projectTypes.js";
import type { TaskRecord } from "./taskTypes.js";

const overview: ProjectOverview = {
  project: {
    id: "project-1",
    name: "Demo",
    path: "C:/Demo",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    metadata: {
      hasPackageJson: true,
      packageManager: "npm",
      scripts: [],
      isGitRepo: true,
      currentBranch: "main"
    }
  },
  taskSummary: {
    backlog: 0,
    ready: 0,
    running: 0,
    needs_review: 1,
    failed: 0,
    blocked: 0,
    done: 1,
    total: 2
  },
  recentRuns: [
    {
      id: "run-1",
      command: "npm test",
      status: "completed",
      startedAt: "2026-01-01T00:00:00.000Z",
      finishedAt: "2026-01-01T00:01:00.000Z",
      exitCode: 0,
      summary: "ok",
      taskId: "task-1",
      taskTitle: "Build docs"
    }
  ],
  nextTask: null
};

const task: TaskRecord = {
  id: "task-1",
  projectId: "project-1",
  title: "Build docs",
  description: "",
  status: "done",
  priority: "medium",
  goal: "",
  context: "",
  acceptanceCriteria: "",
  filesLikelyAffected: "",
  qualityCommands: "",
  securityNotes: "",
  doneDefinition: "",
  dependsOn: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

describe("documentGenerator", () => {
  it("includes task status, run summary, and quality result in progress markdown", () => {
    const markdown = buildProgressMarkdown({
      overview,
      tasks: [task],
      qualityChecks: [
        {
          id: "check-1",
          projectId: "project-1",
          taskId: "task-1",
          agentRunId: "run-1",
          label: "Tests",
          command: "npm test",
          status: "passed",
          output: "",
          exitCode: 0,
          startedAt: "2026-01-01T00:02:00.000Z",
          finishedAt: "2026-01-01T00:03:00.000Z"
        }
      ],
      generatedAt: "2026-01-01T00:04:00.000Z"
    });

    expect(markdown).toContain("| Done | 1 |");
    expect(markdown).toContain("Build docs: completed, exit 0");
    expect(markdown).toContain("Tests: passed, exit 0");
  });

  it("includes project context in generated product docs", () => {
    const markdown = buildDefaultDocumentMarkdown({
      fileName: "PRODUCT.md",
      overview,
      tasks: [task],
      qualityChecks: [],
      generatedAt: "2026-01-01T00:04:00.000Z"
    });

    expect(markdown).toContain("Demo");
    expect(markdown).toContain("Current Snapshot");
  });
});
