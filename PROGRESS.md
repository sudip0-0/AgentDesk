# PROGRESS.md

## Project: AgentDesk

## Current Stage

Phase 1 foundation, Phase 2 project workspace, Phase 3 task board, Phase 4 prompt engine, and Phase 5 terminal engine are complete. Full README MVP criteria are not done yet (agent profiles, quality runner, git UI).

## MVP Definition

Target MVP capabilities (see README.md):

| Capability | Status |
| --- | --- |
| Open a local project | Done |
| Create and manage tasks | Done |
| Generate prompts | Done |
| Launch CLI agents in embedded terminals | Partial (terminals work; task-linked runs and prompts work; agent profiles pending) |
| Save run logs | Done |
| Run quality checks | Not started (Phase 7) |
| Show git status and diffs | Not started (Phase 8) |
| Track progress locally | Partial (SQLite + overview; PROGRESS.md sync pending) |

## Completed

### Phase 1: Desktop App Foundation

- Completed TASK-0101: initialized the Electron, React, and TypeScript desktop app.
- Added a separated Electron main process, sandboxed preload bridge, and React renderer.
- Added root development, lint, typecheck, and production build scripts.
- Added the first desktop layout with sidebar, top bar, main content area, and renderer fallback UI.
- Completed TASK-0102: Tailwind CSS v4 with reusable Button, Card, Input, Dialog, Tabs, and Badge components.
- Completed TASK-0103: SQLite database in app data with Drizzle schema, repeatable migrations, and health probe read/write.

### Phase 5: Terminal Engine

- Completed TASK-0501: node-pty terminal backend in the Electron main process.
- Completed TASK-0502: xterm.js renderer with multi-tab terminal UI and resize handling.
- Completed TASK-0503: chunked terminal log persistence per agent run, paginated transcript viewer, and export.
- Completed the initial node-pty backend for creating, writing to, resizing, and killing PTY sessions.
- Added safe terminal IPC through preload instead of exposing shell or Node access to the renderer.
- Added an xterm.js renderer panel with working-directory selection, terminal input, streamed output, resize forwarding, kill action, and visible error state.
- Added multi-tab terminal UI, PowerShell/CMD shell selection, IPC validation, secret redaction on streamed output, close confirmation when sessions are active, and best-effort waiting-for-input detection.
- Added terminal tests for default shell sizing logic and PTY session startup/output/exit behavior.

### Phase 2: Project Workspace

- Completed TASK-0201: native Electron project folder picker with duplicate-safe SQLite persistence.
- Completed TASK-0202: project metadata detection for package.json, package manager, scripts, git repo, and branch.
- Completed TASK-0203: project overview screen with live task summary, recent runs, next-task hint, and selected-project terminal scoping.
- Linked agent runs and transcript access to the selected project id with validated IPC.

### Phase 3: Task Board

- Completed TASK-0301: task CRUD with SQLite persistence and validated IPC.
- Completed TASK-0302: kanban board with Backlog, Ready, Running, Needs Review, Failed, Blocked, and Done columns.
- Completed TASK-0303: structured task contract fields for goal, context, acceptance criteria, likely files, quality commands, security notes, done definition, and dependencies.
- Added project-scoped task IPC authorization, delete dialog, FK-safe task deletion, and task validation tests.

### Phase 4: Prompt Engine

- Completed TASK-0401: reusable prompt template system with implementation, review, fix, test, and security templates.
- Completed TASK-0402: implementation prompts generated from project and task contract context.
- Completed TASK-0403: review and fix prompts available alongside test and security prompts.
- Added prompt preview UI, copy prompt action, fix-context field for failed checks, send confirmation for long prompts, and clipboard-first line-by-line terminal delivery.

### Phase 6 (partial): Task-Linked Runs

- Task board **Run in Terminal** opens a linked PTY session in the project folder.
- Agent runs store `taskId` and generated implementation `prompt`.
- Task status moves to **running** on launch and to **needs_review** or **failed** when the process exits.
- Implementation prompts can be copied from the task detail panel or on launch.

### Product Discovery

- Defined desktop-first direction.
- Chose local-first workflow.
- Identified target users.
- Defined MVP and non-MVP scope.
- Chose recommended stack.

### Architecture Planning

- Selected Electron + React + TypeScript.
- Selected xterm.js for terminal rendering.
- Selected node-pty for PTY backend.
- Selected SQLite for local storage.
- Selected simple-git for git integration.
- Defined major modules.

### Documentation

Created initial docs:

- README.md
- PRODUCT.md
- ARCHITECTURE.md
- TASKS.md
- PROGRESS.md
- DECISIONS.md
- TESTING.md
- SECURITY.md
- AGENTS.md
- PROMPTS.md
- KNOWN_ISSUES.md

## In Progress

None.

## Next Tasks

Next focused tasks:

1. TASK-0601: Create Agent Profile Data Model.
2. TASK-0602: Add Default Agent Profiles.
3. TASK-0603: Launch Agent from Task.

## Current Risks

- node-pty setup on Windows can be tricky.
- Different CLI agents behave differently.
- Status detection from terminal output will be imperfect.
- Electron security must be handled carefully.
- Log storage can grow large.

## Notes

The first implementation should stay simple.

Do not build cloud sync, team collaboration, GitHub PR automation, or plugin system before the local MVP works.
