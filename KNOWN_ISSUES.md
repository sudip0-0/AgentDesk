# KNOWN_ISSUES.md

## Known Risks and Issues

## 1. node-pty Windows Setup

Status: expected risk

Problem:
node-pty may require native build dependencies or compatible Electron rebuild setup on Windows.

Impact:
Terminal engine may fail during install or packaging.

Mitigation:
Use documented electron rebuild flow and test early on Windows.

---

## 2. CLI Agent Behavior Differences

Status: expected risk

Problem:
Codex, OpenCode, Kiro, Devin, Claude Code, and custom tools have different prompts, flags, TUI behavior, and output formats.

Impact:
Agent status detection will be inconsistent.

Mitigation:
Use agent adapter profiles. Keep status detection best-effort. Allow manual status override.

---

## 3. Terminal Status Detection

Status: expected risk

Problem:
The app may not always know if an agent is done, waiting, or stuck.

Impact:
Task status may need manual correction.

Mitigation:
Use process exit codes, output patterns, and manual controls.

---

## 4. Large Terminal Logs

Status: expected risk

Problem:
Agent sessions can produce huge logs.

Impact:
UI performance and database size can degrade.

Mitigation:
Chunk logs, lazy-load transcripts, allow log deletion and export.

---

## 5. Unsafe Commands

Status: important

Problem:
Agents may suggest or execute dangerous commands.

Impact:
Data loss or project damage.

Mitigation:
Show commands, provide kill button, ask confirmation for app-managed destructive actions.

---

## 6. Electron Security Mistakes

Status: important

Problem:
Misconfigured Electron renderer can expose local system access.

Impact:
High security risk.

Mitigation:
Disable nodeIntegration, enable contextIsolation, validate IPC.

---

## 7. Git Data Loss

Status: important

Problem:
Discard/reset operations can delete agent work.

Impact:
Lost code.

Mitigation:
Ask confirmation, show diff, avoid automatic reset/clean.

---

## 8. Scope Creep

Status: product risk

Problem:
The app can become too large if it tries to be an IDE, SaaS, GitHub client, and agent platform all at once.

Impact:
MVP delays.

Mitigation:
Focus first version on local project, task board, terminal, prompt, logs, checks, git diff.

---

## 9. Packaging Complexity

Status: expected risk

Problem:
Electron packaging with native modules can be tricky.

Impact:
Installer build may fail.

Mitigation:
Test packaging after terminal engine is added, not at the end.

---

## 10. Missing Agent Tools on User Machine

Status: expected risk

Problem:
User may configure Codex/OpenCode/Kiro/Devin but command is not installed or not in PATH.

Impact:
Launch fails.

Mitigation:
Add "Test Command" button for every agent profile.
Show clear error when command not found.
