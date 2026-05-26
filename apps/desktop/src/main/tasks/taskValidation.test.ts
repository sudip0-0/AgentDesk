import { describe, expect, it } from "vitest";
import {
  parseTaskPayload,
  taskDeleteSchema,
  taskInputSchema,
  taskStatusUpdateSchema,
  taskUpdateSchema
} from "./taskValidation.js";

const validTask = {
  projectId: "550e8400-e29b-41d4-a716-446655440000",
  title: "Example task",
  description: "",
  status: "backlog" as const,
  priority: "medium" as const,
  goal: "",
  context: "",
  acceptanceCriteria: "",
  filesLikelyAffected: "",
  qualityCommands: "",
  securityNotes: "",
  doneDefinition: "",
  dependsOn: ""
};

describe("taskValidation", () => {
  it("requires project id on status updates", () => {
    const result = parseTaskPayload(taskStatusUpdateSchema, {
      id: "660e8400-e29b-41d4-a716-446655440001",
      status: "ready"
    });

    expect(result.success).toBe(false);
  });

  it("requires project id on delete", () => {
    const result = parseTaskPayload(taskDeleteSchema, {
      id: "660e8400-e29b-41d4-a716-446655440001"
    });

    expect(result.success).toBe(false);
  });

  it("accepts blocked status", () => {
    const result = parseTaskPayload(taskInputSchema, {
      ...validTask,
      status: "blocked"
    });

    expect(result.success).toBe(true);
  });

  it("requires project id on update", () => {
    const result = parseTaskPayload(taskUpdateSchema, {
      id: "660e8400-e29b-41d4-a716-446655440001",
      title: validTask.title,
      description: validTask.description,
      status: validTask.status,
      priority: validTask.priority,
      goal: validTask.goal,
      context: validTask.context,
      acceptanceCriteria: validTask.acceptanceCriteria,
      filesLikelyAffected: validTask.filesLikelyAffected,
      qualityCommands: validTask.qualityCommands,
      securityNotes: validTask.securityNotes,
      doneDefinition: validTask.doneDefinition,
      dependsOn: validTask.dependsOn
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid update payloads with project id", () => {
    const result = parseTaskPayload(taskUpdateSchema, {
      ...validTask,
      id: "660e8400-e29b-41d4-a716-446655440001"
    });

    expect(result.success).toBe(true);
  });
});
