import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase } from "./client.js";
import { checkDatabaseHealth } from "./health.js";
import { runMigrations } from "./migrate.js";
import { setDatabasePathForTests } from "./paths.js";
import { ensureDefaultProject } from "./seed.js";
import { startAgentRun, finishAgentRun } from "./repositories/agentRunRepository.js";
import {
  appendTerminalLogChunk,
  buildTranscript,
  getTerminalLogMeta,
  listTerminalLogChunks
} from "./repositories/terminalLogRepository.js";
import Database from "better-sqlite3";

const resetDatabase = (): void => {
  closeDatabase();
  setDatabasePathForTests(null);
};

describe("database", () => {
  let databaseDirectory = "";

  beforeEach(() => {
    databaseDirectory = mkdtempSync(join(tmpdir(), "agentdesk-db-"));
    setDatabasePathForTests(join(databaseDirectory, "agentdesk.db"));
  });

  afterEach(() => {
    resetDatabase();
    rmSync(databaseDirectory, { recursive: true, force: true });
  });

  it("applies migrations only once", () => {
    const sqlite = new Database(join(databaseDirectory, "repeat.db"));
    runMigrations(sqlite);
    runMigrations(sqlite);

    const rows = sqlite.prepare("SELECT id FROM schema_migrations").all() as { id: string }[];
    expect(rows).toHaveLength(1);
    sqlite.close();
  });

  it("passes health check and stores terminal log chunks", () => {
    const health = checkDatabaseHealth(join(databaseDirectory, "agentdesk.db"));
    expect(health.ok).toBe(true);

    ensureDefaultProject();
    const runId = startAgentRun({
      terminalSessionId: "session-1",
      command: "powershell.exe",
      cwd: databaseDirectory
    });

    appendTerminalLogChunk(runId, "line-one\n");
    appendTerminalLogChunk(runId, "line-two\n");

    const meta = getTerminalLogMeta(runId);
    expect(meta.chunkCount).toBe(2);
    expect(meta.characterCount).toBe("line-one\nline-two\n".length);

    const chunks = listTerminalLogChunks(runId, 0, 10);
    expect(chunks).toHaveLength(2);
    expect(buildTranscript(runId)).toBe("line-one\nline-two\n");

    finishAgentRun(runId, "completed", 0);
  });
});
