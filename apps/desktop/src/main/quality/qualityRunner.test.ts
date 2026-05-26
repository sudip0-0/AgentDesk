import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase } from "../db/client.js";
import { setDatabasePathForTests } from "../db/paths.js";
import { createQualityCommand, listQualityChecks } from "../db/repositories/qualityRepository.js";
import { ensureDefaultProject } from "../db/seed.js";
import { openProjectFromPath } from "../db/repositories/projectRepository.js";
import { runQualityChecks } from "./qualityRunner.js";

const resetDatabase = (): void => {
  closeDatabase();
  setDatabasePathForTests(null);
};

describe("qualityRunner", () => {
  let databaseDirectory = "";

  beforeEach(() => {
    databaseDirectory = mkdtempSync(join(tmpdir(), "agentdesk-quality-"));
    setDatabasePathForTests(join(databaseDirectory, "agentdesk.db"));
    ensureDefaultProject();
  });

  afterEach(() => {
    resetDatabase();
    rmSync(databaseDirectory, { recursive: true, force: true });
  });

  it("runs configured commands and stores pass/fail output", async () => {
    const projectDirectory = join(databaseDirectory, "node-project");
    mkdirSync(projectDirectory, { recursive: true });
    writeFileSync(join(projectDirectory, "package.json"), JSON.stringify({ scripts: {} }));
    const { project } = openProjectFromPath(projectDirectory);

    createQualityCommand({
      projectId: project.id,
      label: "Pass",
      command: "node -e \"console.log('pass')\"",
      required: true,
      timeoutMs: 10_000
    });
    createQualityCommand({
      projectId: project.id,
      label: "Fail",
      command: "node -e \"console.error('fail'); process.exit(2)\"",
      required: true,
      timeoutMs: 10_000
    });

    const results = await runQualityChecks({ projectId: project.id });

    expect(results.some((result) => result.status === "passed" && result.output.includes("pass"))).toBe(true);
    expect(results.some((result) => result.status === "failed" && result.exitCode === 2)).toBe(true);
    expect(listQualityChecks({ projectId: project.id }).length).toBeGreaterThanOrEqual(2);
  });

  it("marks optional failures as skipped and redacts secrets in output", async () => {
    const projectDirectory = join(databaseDirectory, "optional-project");
    mkdirSync(projectDirectory, { recursive: true });
    writeFileSync(join(projectDirectory, "package.json"), JSON.stringify({ scripts: {} }));
    const { project } = openProjectFromPath(projectDirectory);

    createQualityCommand({
      projectId: project.id,
      label: "Optional fail",
      command: "node -e \"console.log('OPENAI_API_KEY=sk-testsecret1234567890'); process.exit(1)\"",
      required: false,
      timeoutMs: 10_000
    });

    const results = await runQualityChecks({ projectId: project.id });

    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe("skipped");
    expect(results[0]?.output).toContain("[REDACTED]");
    expect(results[0]?.output).not.toContain("sk-testsecret1234567890");
  });
});
