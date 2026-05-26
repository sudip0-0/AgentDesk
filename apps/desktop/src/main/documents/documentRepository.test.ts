import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase } from "../db/client.js";
import { setDatabasePathForTests } from "../db/paths.js";
import { openProjectFromPath } from "../db/repositories/projectRepository.js";
import {
  previewDefaultDocuments,
  validateDocumentPreviewFile,
  writePreviewedDocuments
} from "./documentRepository.js";

const resetDatabase = (): void => {
  closeDatabase();
  setDatabasePathForTests(null);
};

describe("documentRepository", () => {
  let databaseDirectory = "";
  let projectDirectory = "";

  beforeEach(() => {
    databaseDirectory = mkdtempSync(join(tmpdir(), "agentdesk-doc-db-"));
    projectDirectory = mkdtempSync(join(tmpdir(), "agentdesk-doc-project-"));
    setDatabasePathForTests(join(databaseDirectory, "agentdesk.db"));
    mkdirSync(projectDirectory, { recursive: true });
  });

  afterEach(() => {
    resetDatabase();
    rmSync(databaseDirectory, { recursive: true, force: true });
    rmSync(projectDirectory, { recursive: true, force: true });
  });

  it("previews default docs with project-aware content", () => {
    writeFileSync(join(projectDirectory, "package.json"), JSON.stringify({ scripts: { test: "vitest run" } }));
    const { project } = openProjectFromPath(projectDirectory);
    const preview = previewDefaultDocuments(project.id);
    const product = preview.files.find((file) => file.name === "PRODUCT.md");

    expect(product?.content).toContain(project.name);
    expect(product?.content).toContain("Current Snapshot");
  });

  it("writes only validated project paths", () => {
    const { project } = openProjectFromPath(projectDirectory);
    const targetPath = join(projectDirectory, "PROGRESS.md");
    const preview = previewDefaultDocuments(project.id);
    const progress = preview.files.find((file) => file.name === "PROGRESS.md");

    if (!progress) {
      throw new Error("Expected PROGRESS.md preview.");
    }

    const result = writePreviewedDocuments({
      projectId: project.id,
      files: [{ ...progress, content: "# Synced progress" }]
    });

    expect(result.writtenFiles).toEqual([targetPath]);
    expect(readFileSync(targetPath, "utf8")).toBe("# Synced progress");
  });

  it("rejects mismatched document paths", () => {
    const { project } = openProjectFromPath(projectDirectory);

    expect(() =>
      validateDocumentPreviewFile(project.path, {
        name: "README.md",
        path: join(projectDirectory, "..", "outside.md"),
        content: "unsafe",
        exists: false
      })
    ).toThrow(/outside the selected project/i);

    expect(() =>
      writePreviewedDocuments({
        projectId: project.id,
        files: [
          {
            name: "README.md",
            path: join(projectDirectory, "README.md"),
            content: "safe",
            exists: false
          },
          {
            name: "TASKS.md",
            path: join(projectDirectory, "..", "TASKS.md"),
            content: "unsafe",
            exists: false
          }
        ]
      })
    ).toThrow(/outside the selected project/i);
  });
});
