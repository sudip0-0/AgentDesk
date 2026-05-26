import { describe, expect, it } from "vitest";
import { buildImplementationPrompt } from "./buildTaskPrompt.js";

describe("buildImplementationPrompt", () => {
  it("includes task contract sections and project path", () => {
    const prompt = buildImplementationPrompt(
      {
        id: "770e8400-e29b-41d4-a716-446655440000",
        projectId: "550e8400-e29b-41d4-a716-446655440000",
        title: "Add task linking",
        description: "Wire task id into runs.",
        status: "ready",
        priority: "medium",
        goal: "Link runs to tasks.",
        context: "Phase 6 slice.",
        acceptanceCriteria: "Runs store task id.",
        filesLikelyAffected: "terminalSessionManager.ts",
        qualityCommands: "npm test",
        securityNotes: "Validate task ownership.",
        doneDefinition: "Tests pass.",
        dependsOn: "TASK-0301",
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString()
      },
      { name: "AgentDesk", path: "C:/Projects/AgentDesk" }
    );

    expect(prompt).toContain('project "AgentDesk"');
    expect(prompt).toContain("Project path: C:/Projects/AgentDesk");
    expect(prompt).toContain("Add task linking");
    expect(prompt).toContain("Link runs to tasks.");
    expect(prompt).toContain("npm test");
    expect(prompt).toContain("TASK-0301");
    expect(prompt).toContain("Do not edit unrelated files");
  });
});
