/**
 * Command safety classifier.
 *
 * Pure logic shared by the main process (to block dangerous quality commands)
 * and the renderer (to warn before the user runs them). It does not execute
 * anything; it only inspects command text and reports findings.
 *
 * The goal is to catch obviously destructive or secret-touching commands, not to
 * be a perfect sandbox. Detection is best-effort and conservative: it favours
 * flagging a few extra commands over silently running a destructive one.
 */

export type CommandRiskLevel = "safe" | "warn" | "block";

export interface CommandRisk {
  /** Highest risk level found across all matched rules. */
  level: CommandRiskLevel;
  /** Human-readable reasons, one per matched rule. */
  reasons: string[];
}

interface SafetyRule {
  id: string;
  level: Exclude<CommandRiskLevel, "safe">;
  reason: string;
  pattern: RegExp;
}

/**
 * Rules are matched against the raw command string (case-insensitive). Patterns
 * are intentionally narrow so normal commands such as `npm run build` or
 * `git status` are never flagged.
 */
const safetyRules: SafetyRule[] = [
  {
    id: "rm-recursive-force",
    level: "block",
    reason: "Recursive force delete (rm -rf) can erase files irreversibly.",
    // rm with both recursive and force flags, in any flag order/combination.
    pattern: /\brm\s+(?:-[a-z]*\s+)*-[a-z]*r[a-z]*f|\brm\s+(?:-[a-z]*\s+)*-[a-z]*f[a-z]*r|\brm\s+(?:-[a-z]*\s+)*--(?:recursive|force)\b/i
  },
  {
    id: "windows-del-recursive",
    level: "block",
    reason: "Recursive delete (del /s) removes files without recovery.",
    pattern: /\bdel\b[^\n]*\/s\b|\brmdir\b[^\n]*\/s\b|\brd\b[^\n]*\/s\b/i
  },
  {
    id: "powershell-remove-recurse",
    level: "block",
    reason: "Remove-Item -Recurse -Force deletes folders irreversibly.",
    pattern: /remove-item\b[^\n]*-recurse|remove-item\b[^\n]*-force\b/i
  },
  {
    id: "git-reset-hard",
    level: "block",
    reason: "git reset --hard discards uncommitted work.",
    pattern: /\bgit\b[^\n]*reset\b[^\n]*--hard\b/i
  },
  {
    id: "git-clean-force",
    level: "block",
    reason: "git clean -f deletes untracked files, including new agent output.",
    pattern: /\bgit\b[^\n]*clean\b[^\n]*-[a-z]*f/i
  },
  {
    id: "git-force-push",
    level: "block",
    reason: "Force push can overwrite remote history.",
    pattern: /\bgit\b[^\n]*push\b[^\n]*(?:--force\b|--force-with-lease\b|\s-f\b)/i
  },
  {
    id: "git-checkout-discard",
    level: "warn",
    reason: "git checkout/restore can overwrite local changes.",
    pattern: /\bgit\b[^\n]*(?:checkout\s+--\s|restore\s+--\s|restore\s+\.)/i
  },
  {
    id: "disk-format",
    level: "block",
    reason: "Disk format / partition commands destroy data.",
    pattern: /\b(?:mkfs(?:\.\w+)?|format\s+[a-z]:|diskpart)\b/i
  },
  {
    id: "dd-write",
    level: "block",
    reason: "dd can overwrite disks or devices.",
    pattern: /\bdd\b[^\n]*\bof=/i
  },
  {
    id: "fork-bomb",
    level: "block",
    reason: "Looks like a fork bomb.",
    pattern: /:\(\)\s*\{.*\|.*&\s*\}\s*;/
  },
  {
    id: "secret-files",
    level: "block",
    reason: "Reads SSH keys, credentials, tokens, or environment secrets.",
    pattern: /(?:\.ssh\/id_|id_rsa\b|\.aws\/credentials|\.npmrc\b|\.netrc\b|\.env\b[^\n]*(?:>|\||cat|type)|\bprivate[_-]?key\b)/i
  },
  {
    id: "pipe-to-shell",
    level: "block",
    reason: "Pipes a remote download straight into a shell (curl|sh).",
    pattern: /\b(?:curl|wget|iwr|invoke-webrequest)\b[^\n]*\|\s*(?:sh|bash|zsh|powershell|pwsh|cmd)\b/i
  },
  {
    id: "shutdown",
    level: "warn",
    reason: "Shuts down or reboots the machine.",
    pattern: /\b(?:shutdown|reboot|halt)\b/i
  }
];

const riskOrder: Record<CommandRiskLevel, number> = {
  safe: 0,
  warn: 1,
  block: 2
};

const maxLevel = (a: CommandRiskLevel, b: CommandRiskLevel): CommandRiskLevel =>
  riskOrder[a] >= riskOrder[b] ? a : b;

/** Classifies a single command string. Empty input is treated as safe. */
export const classifyCommand = (command: string): CommandRisk => {
  const text = command.trim();

  if (!text) {
    return { level: "safe", reasons: [] };
  }

  let level: CommandRiskLevel = "safe";
  const reasons: string[] = [];

  for (const rule of safetyRules) {
    if (rule.pattern.test(text)) {
      level = maxLevel(level, rule.level);
      reasons.push(rule.reason);
    }
  }

  return { level, reasons };
};

export const isCommandBlocked = (command: string): boolean =>
  classifyCommand(command).level === "block";

/** Builds a single-line explanation suitable for logs and check output. */
export const describeCommandRisk = (risk: CommandRisk): string =>
  risk.reasons.length > 0 ? risk.reasons.join(" ") : "No safety concerns detected.";
