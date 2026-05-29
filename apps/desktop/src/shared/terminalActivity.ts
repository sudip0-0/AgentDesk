export type TerminalActivityState = "busy" | "waiting_for_input" | "idle";

export const TERMINAL_OUTPUT_TAIL_LIMIT = 4_096;

// eslint-disable-next-line no-control-regex -- ANSI escape sequences must be stripped from PTY output.
const ANSI_ESCAPE_PATTERN = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;

const SHELL_PROMPT_PATTERNS: RegExp[] = [
  /^PS [^>\r\n]+>\s*$/,
  /^[A-Z]:\\[^>\r\n]*>\s*$/,
  /^>\s*$/,
  /^\$\s*#?\s*$/
];

const LINE_WAITING_PATTERNS: RegExp[] = [
  /\(\s*[Yy]\s*\/\s*[Nn]\s*\)\s*$/,
  /\[\s*[Yy]\s*\/\s*[Nn]\s*\]/i,
  /Continue\?\s*$/i,
  /(?:Do you want|Would you like) to\b/i,
  /(?:choose|select) (?:an option|one)\b/i,
  /Enter your\b/i,
  /Please confirm\b/i,
  /\(yes\/no\)/i
];

const TAIL_WAITING_PATTERNS: RegExp[] = [
  /Press (?:any key|Enter) to continue/i,
  /Press Enter/i,
  /waiting for (?:input|your response|confirmation)/i
];

export const stripAnsi = (text: string): string => text.replace(ANSI_ESCAPE_PATTERN, "");

export const appendOutputTail = (current: string, chunk: string, limit = TERMINAL_OUTPUT_TAIL_LIMIT): string =>
  `${current}${chunk}`.slice(-limit);

const getLastNonEmptyLine = (text: string): string => {
  const lines = text.split(/\r?\n/).map((line) => line.trimEnd());

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]?.trim() ?? "";

    if (line.length > 0) {
      return line;
    }
  }

  return "";
};

const isShellPromptLine = (line: string): boolean =>
  SHELL_PROMPT_PATTERNS.some((pattern) => pattern.test(line));

const matchesWaitingPattern = (tail: string, lastLine: string): boolean => {
  if (LINE_WAITING_PATTERNS.some((pattern) => pattern.test(lastLine))) {
    return true;
  }

  if (TAIL_WAITING_PATTERNS.some((pattern) => pattern.test(tail))) {
    return true;
  }

  if (isShellPromptLine(lastLine)) {
    return false;
  }

  if (lastLine.length === 0 || lastLine.length > 160) {
    return false;
  }

  if (/https?:\/\//i.test(lastLine)) {
    return false;
  }

  return /[:?]\s*$/.test(lastLine);
};

/**
 * Best-effort detection for interactive prompts (y/n, Enter, colon prompts).
 * False positives/negatives are possible across different CLIs.
 */
export const detectWaitingForInput = (recentOutput: string): boolean => {
  const tail = stripAnsi(recentOutput).trimEnd();

  if (!tail) {
    return false;
  }

  const lastLine = getLastNonEmptyLine(tail);

  return matchesWaitingPattern(tail.slice(-512), lastLine);
};
