import { describe, expect, it } from "vitest";
import { buildImplementationPrompt } from "./buildTaskPrompt.js";

describe("buildImplementationPrompt", () => {
  it("includes task contract sections", () => {
    const prompt = buildImplementationPrompt(
      {
        title: "Add task linking",
        description: "Wire task id into runs.",
        goal: "Link runs to tasks.",
        context: "Phase 6 slice.",
        acceptanceCriteria: "Runs store task id.",
        filesLikelyAffected: "terminalSessionManager.ts",
        qualityCommands: "npm test",
        securityNotes: "Validate task ownership.",
        doneDefinition: "Tests pass.",
        dependsOn: "TASK-0301"
      },
      "AgentDesk"
    );

    expect(prompt).toContain('project "AgentDesk"');
    expect(prompt).toContain("Add task linking");
    expect(prompt).toContain("Link runs to tasks.");
    expect(prompt).toContain("npm test");
    expect(prompt).toContain("TASK-0301");
    expect(prompt).toContain("Do not change unrelated files.");
  });
});
