import { describe, expect, it } from "vitest";
import { buildPrompt, promptTemplateIds } from "./promptEngine.js";
import type { PromptContext } from "./promptEngine.js";

const context: PromptContext = {
  project: {
    name: "AgentDesk",
    path: "C:/Projects/AgentDesk"
  },
  task: {
    id: "770e8400-e29b-41d4-a716-446655440000",
    projectId: "550e8400-e29b-41d4-a716-446655440000",
    title: "Generate prompts",
    description: "Create prompt preview UI.",
    status: "ready",
    priority: "high",
    goal: "Generate strong prompts from task context.",
    context: "Phase 4 prompt engine.",
    acceptanceCriteria: "Implementation, review, fix, test, and security prompts exist.",
    filesLikelyAffected: "apps/desktop/src/shared/promptEngine.ts",
    qualityCommands: "npm run lint\nnpm test",
    securityNotes: "Renderer must not access shell directly.",
    doneDefinition: "Quality commands pass.",
    dependsOn: "TASK-0303",
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString()
  }
};

describe("prompt engine", () => {
  it("builds every template with project and task context", () => {
    for (const templateId of promptTemplateIds) {
      const prompt = buildPrompt(templateId, context);

      expect(prompt).toContain('project "AgentDesk"');
      expect(prompt).toContain("Task ID: 770e8400-e29b-41d4-a716-446655440000");
      expect(prompt).toContain("Generate strong prompts from task context.");
      expect(prompt).toContain("Implementation, review, fix, test, and security prompts exist.");
      expect(prompt).toContain("npm run lint");
      expect(prompt).toContain("README.md");
      expect(prompt).toContain("apps/desktop/src/shared/promptEngine.ts");
      expect(prompt).toContain("unrelated files");
      expect(prompt).toMatch(/honestly|Report checks/);
    }
  });

  it("adds review and fix-specific instructions", () => {
    expect(buildPrompt("review", context)).toContain("Architecture boundaries are preserved.");
    expect(buildPrompt("fix", context)).toContain("Fix only the issues");
    expect(buildPrompt("test", context)).toContain("Prefer pure logic");
    expect(buildPrompt("security", context)).toContain("IPC input is validated");
  });

  it("injects failed check context into fix prompts", () => {
    const prompt = buildPrompt("fix", {
      ...context,
      fixContext: "npm run typecheck failed: TS2345 in App.tsx"
    });

    expect(prompt).toContain("Failed Checks And Required Corrections");
    expect(prompt).toContain("npm run typecheck failed: TS2345 in App.tsx");
  });
});
