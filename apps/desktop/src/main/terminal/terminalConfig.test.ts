import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  getDefaultShell,
  normalizeTerminalSize,
  resolveShell,
  resolveTerminalCwd
} from "./terminalConfig.js";

describe("terminalConfig", () => {
  it("uses PowerShell as the default Windows shell", () => {
    expect(getDefaultShell("win32")).toBe("powershell.exe");
  });

  it("resolves CMD on Windows", () => {
    const cmdShell = resolveShell("cmd", "win32");
    expect(cmdShell.toLowerCase()).toContain("cmd");
  });

  it("normalizes invalid terminal dimensions", () => {
    expect(normalizeTerminalSize(2, 1)).toEqual({ cols: 80, rows: 24 });
    expect(normalizeTerminalSize(120, 40)).toEqual({ cols: 120, rows: 40 });
  });

  it("resolves existing directories and rejects missing paths", () => {
    const directory = join(tmpdir(), `agentdesk-terminal-${Date.now()}`);
    mkdirSync(directory, { recursive: true });

    try {
      expect(resolveTerminalCwd(directory)).toBe(directory);
      expect(() => resolveTerminalCwd(join(directory, "missing-folder"))).toThrow(
        /does not exist/
      );
    } finally {
      if (existsSync(directory)) {
        rmSync(directory, { recursive: true, force: true });
      }
    }
  });
});
