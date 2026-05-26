import { describe, expect, it } from "vitest";
import { getDefaultShell, normalizeTerminalSize } from "./terminalConfig.js";

describe("terminalConfig", () => {
  it("uses PowerShell as the default Windows shell", () => {
    expect(getDefaultShell("win32")).toBe("powershell.exe");
  });

  it("normalizes invalid terminal dimensions", () => {
    expect(normalizeTerminalSize(2, 1)).toEqual({ cols: 80, rows: 24 });
    expect(normalizeTerminalSize(120, 40)).toEqual({ cols: 120, rows: 40 });
  });
});
