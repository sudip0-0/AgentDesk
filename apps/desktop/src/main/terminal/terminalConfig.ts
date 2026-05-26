import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";

export const DEFAULT_TERMINAL_COLS = 80;
export const DEFAULT_TERMINAL_ROWS = 24;

export interface TerminalSize {
  cols: number;
  rows: number;
}

export const getDefaultShell = (platform = process.platform): string => {
  if (platform === "win32") {
    return "powershell.exe";
  }

  return process.env.SHELL ?? "/bin/sh";
};

export const normalizeTerminalSize = (cols?: number, rows?: number): TerminalSize => ({
  cols:
    typeof cols === "number" && Number.isInteger(cols) && cols >= 20 && cols <= 500
      ? cols
      : DEFAULT_TERMINAL_COLS,
  rows:
    typeof rows === "number" && Number.isInteger(rows) && rows >= 5 && rows <= 200
      ? rows
      : DEFAULT_TERMINAL_ROWS
});

export const resolveTerminalCwd = (requestedCwd?: string, fallbackCwd = homedir()): string => {
  const candidate = requestedCwd?.trim() ? requestedCwd : fallbackCwd;
  const absolutePath = isAbsolute(candidate) ? candidate : resolve(fallbackCwd, candidate);

  if (!existsSync(absolutePath) || !statSync(absolutePath).isDirectory()) {
    throw new Error("Working directory does not exist or is not a directory.");
  }

  return absolutePath;
};
