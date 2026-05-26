import { describe, expect, it } from "vitest";
import {
  documentProjectSchema,
  documentsWriteSchema,
  parseDocumentPayload
} from "./documentValidation.js";

describe("documentValidation", () => {
  it("requires a project id", () => {
    const result = parseDocumentPayload(documentProjectSchema, {});

    expect(result.success).toBe(false);
  });

  it("accepts write payloads for known document names", () => {
    const result = parseDocumentPayload(documentsWriteSchema, {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      files: [
        {
          name: "PROGRESS.md",
          path: "C:/Projects/Demo/PROGRESS.md",
          content: "# Progress",
          exists: true
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("rejects unknown document names", () => {
    const result = parseDocumentPayload(documentsWriteSchema, {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      files: [
        {
          name: "CUSTOM.md",
          path: "C:/Projects/Demo/CUSTOM.md",
          content: "# Custom",
          exists: false
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("rejects oversized write batches", () => {
    const result = parseDocumentPayload(documentsWriteSchema, {
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      files: Array.from({ length: 12 }, (_, index) => ({
        name: "README.md",
        path: `C:/Projects/Demo/file-${index}.md`,
        content: "x",
        exists: false
      }))
    });

    expect(result.success).toBe(false);
  });
});
