import { describe, expect, it } from "vitest";
import {
  createTerminalRequestSchema,
  parseIpcPayload,
  terminalKillRequestSchema,
  terminalWriteRequestSchema
} from "./terminalValidation.js";

describe("terminalValidation", () => {
  it("accepts an optional task id when creating a terminal", () => {
    const result = parseIpcPayload(createTerminalRequestSchema, {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      taskId: "660e8400-e29b-41d4-a716-446655440001"
    });

    expect(result.success).toBe(true);
  });

  it("requires a project id when creating a terminal", () => {
    const result = parseIpcPayload(createTerminalRequestSchema, {
      cwd: "."
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid write payloads", () => {
    const result = parseIpcPayload(terminalWriteRequestSchema, {
      id: "not-a-uuid",
      data: "hello"
    });

    expect(result.success).toBe(false);
  });

  it("rejects oversized write payloads", () => {
    const result = parseIpcPayload(terminalWriteRequestSchema, {
      id: "550e8400-e29b-41d4-a716-446655440000",
      data: "x".repeat(70_000)
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid kill payloads", () => {
    const result = parseIpcPayload(terminalKillRequestSchema, {
      id: "550e8400-e29b-41d4-a716-446655440000"
    });

    expect(result.success).toBe(true);
  });
});
