import { describe, expect, it } from "vitest";
import {
  createFixTaskSchema,
  parseQualityPayload,
  projectQualitySchema,
  qualityCommandInputSchema,
  runQualityChecksSchema
} from "./qualityValidation.js";

describe("qualityValidation", () => {
  it("requires a project id", () => {
    const result = parseQualityPayload(projectQualitySchema, {});

    expect(result.success).toBe(false);
  });

  it("accepts run payloads with optional task and run ids", () => {
    const result = parseQualityPayload(runQualityChecksSchema, {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      taskId: "660e8400-e29b-41d4-a716-446655440001",
      agentRunId: "770e8400-e29b-41d4-a716-446655440002"
    });

    expect(result.success).toBe(true);
  });

  it("rejects empty quality command labels", () => {
    const result = parseQualityPayload(qualityCommandInputSchema, {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      label: "   ",
      command: "npm test",
      required: true,
      timeoutMs: 10_000
    });

    expect(result.success).toBe(false);
  });

  it("accepts fix task payloads", () => {
    const result = parseQualityPayload(createFixTaskSchema, {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      qualityCheckId: "660e8400-e29b-41d4-a716-446655440001"
    });

    expect(result.success).toBe(true);
  });
});
