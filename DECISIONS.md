# DECISIONS.md

## Decision 1: Build Desktop App Before SaaS

Status: accepted

Context:
Coding-agent CLI tools need local filesystem access, terminal access, project commands, git, and environment variables.

Decision:
Build AgentDesk as a local-first Windows desktop app.

Reason:
A desktop app is better for managing local repos and CLI tools.

Consequences:

- Easier local agent orchestration.
- Better trust for users.
- More OS-specific complexity.
- Later cloud version remains possible.

---

## Decision 2: Use Electron for MVP

Status: accepted

Context:
The app needs embedded terminals, Node.js access, PTY support, filesystem access, and Windows shell integration.

Decision:
Use Electron.

Reason:
Electron works well with node-pty, xterm.js, filesystem, and local processes.

Consequences:

- Faster MVP.
- Larger app size than Tauri.
- More mature terminal ecosystem.
- Must follow Electron security best practices.

---

## Decision 3: Use node-pty and xterm.js

Status: accepted

Context:
Coding-agent CLIs need interactive terminal behavior.

Decision:
Use node-pty in main process and xterm.js in renderer.

Reason:
Simple child_process execution is not enough for interactive TUIs and approval prompts.

Consequences:

- Better compatibility with CLI tools.
- More complexity in terminal lifecycle handling.
- Need careful process cleanup.

---

## Decision 4: Use SQLite for Local Storage

Status: accepted

Context:
The app needs local persistent data.

Decision:
Use SQLite.

Reason:
SQLite is simple, local-first, reliable, and easy to package.

Consequences:

- No server required.
- Great for MVP.
- Later sync will need conflict-handling design.

---

## Decision 5: Support Agent Profiles Instead of Hardcoding Tools

Status: accepted

Context:
Codex, OpenCode, Kiro, Devin, and other tools have different command formats.

Decision:
Create an agent profile system and adapter layer.

Reason:
The app should support existing and future CLI tools.

Consequences:

- More flexible.
- Slightly more upfront architecture work.
- Users can add custom commands.

---

## Decision 6: Every Agent Run Must Belong to a Task

Status: accepted

Context:
Random terminal sessions become hard to track.

Decision:
Every agent run should attach to a project and optionally a task.

Reason:
This creates traceability from task to prompt to log to result.

Consequences:

- Better project management.
- Easier review and progress tracking.
- Some manual terminal sessions may use a "Manual" task.

---

## Decision 7: Human Approval Before Commit or Destructive Actions

Status: accepted

Context:
Agents can make mistakes or run unsafe commands.

Decision:
AgentDesk must require confirmation before commits, discards, deletes, branch resets, or pushes.

Reason:
The user must stay in control.

Consequences:

- Safer workflow.
- Slightly less automation.
- Better trust.

---

## Decision 8: Start with JavaScript/TypeScript Projects

Status: accepted

Context:
Supporting all tech stacks from day one increases complexity.

Decision:
MVP optimizes for JS/TS projects first.

Reason:
Node projects have predictable scripts and package files.

Consequences:

- Faster MVP.
- Easier quality checks.
- Python, Flutter, .NET, Go, and Rust can be added later.

---

## Decision 9: Keep Prompt Engine in Desktop Shared Code for MVP

Status: accepted

Context:
`ARCHITECTURE.md` describes a future `packages/core/prompt-engine` module, but the MVP needs prompt generation immediately inside the Electron app.

Decision:
Implement prompt templates in `apps/desktop/src/shared/promptEngine.ts` as pure TypeScript with no Electron or filesystem dependencies.

Reason:
The renderer and main process can share the same prompt builder without new package wiring, and the logic is easy to test with Vitest.

Consequences:

- Faster delivery for Phase 4.
- A later extraction into `packages/core/prompt-engine` remains straightforward.
- Template versioning in markdown/files can be added without changing the IPC boundary.
