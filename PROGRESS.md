# PROGRESS.md

## Project: AgentDesk

## Current Stage

Phase 1 foundation through Phase 10 polish and portfolio readiness are complete.

## MVP Definition

Target MVP capabilities (see README.md):

| Capability | Status |
| --- | --- |
| Open a local project | Done |
| Create and manage tasks | Done |
| Generate prompts | Done |
| Launch CLI agents in embedded terminals | Done |
| Save run logs | Done |
| Run quality checks | Done |
| Show git status and diffs | Done |
| Track progress locally | Done (SQLite + previewed PROGRESS.md sync) |

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

### Phase 6: Agent Profiles

- Completed TASK-0601: agent profile model with command, args template, shell, mode, environment variables, working-directory behavior, and prompt delivery.
- Completed TASK-0602: default profiles for Codex, OpenCode, Kiro CLI, Devin CLI, Claude Code, and Custom Command.
- Completed TASK-0603: task launch flow with selected profile, command preview, confirmation, linked run creation, PTY launch, prompt delivery, logs, and task status lifecycle.
- Task board **Launch Agent** opens a linked PTY session in the project folder.
- Agent runs store `taskId`, `agentProfileId`, command preview, and generated implementation `prompt`.
- Task status moves to **running** on launch and to **needs_review** or **failed** when the process exits.
- Agent profiles can be created, edited, and deleted from the Agents screen.

### Phase 7: Quality Checks

- Completed TASK-0701: per-project quality command configuration with default Node commands.
- Completed TASK-0702: quality runner executes commands in the project folder and stores stdout/stderr, exit code, status, and timing.
- Completed TASK-0703: failed quality results can create follow-up fix tasks.
- Added pass/fail/skipped result display, result detail output, and timeout enforcement per command.

### Phase 8: Git Integration

- Completed TASK-0801: git status screen shows repository state, current branch, changed files, and staged/unstaged groupings.
- Completed TASK-0802: selected changed files display staged or unstaged diffs, with truncation and binary-file messaging.
- Completed TASK-0803: users can create a branch from a task, stage selected files, edit a generated commit message, and confirm a local-only commit.
- Added git IPC through preload with main-process execution, project-scoped file checks, untracked/mixed diffs, branch/commit confirmations, and graceful non-git folder handling.

### Phase 9: Documents and Progress

- Completed TASK-0901: default project docs can be generated as markdown previews before writing.
- Completed TASK-0902: PROGRESS.md can be previewed from current task statuses, recent run summaries, and recent quality results before writing.
- Added a Documents screen with selectable preview files, create/overwrite indicators, and explicit write confirmation.
- Added document IPC through preload with main-process writes scoped to the selected project folder.
- Hardened templates, task-board progress sync, path validation for new files, and repository tests.

### Phase 10: Polish and Portfolio Readiness

- Completed TASK-1001: keyboard shortcuts and command palette for create task, launch agent, run checks, terminal navigation, and sidebar switching.
- Completed TASK-1002: agent run detail screen with task, agent, command, prompt, transcript, changed files, quality results, notes, and duration.
- Completed TASK-1003: demo flow panel on the Projects screen linking open repo, task, agent, terminal, checks, git diff, run detail, and done workflow.

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
- Selected system Git CLI in the main process for git integration.
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

## Recent Hardening (post-MVP)

- Added a command safety layer (`shared/commandSafety.ts`) that blocks clearly
  destructive quality commands before execution and warns on risky ones in the
  Quality screen. Added a `blocked` quality-check status.
- Added agent availability detection: the Agents screen shows Installed/Missing
  status per profile (`shared/agentAvailability.ts` + main-process probe) and a
  "Test Command" button that runs a `--version` probe with redacted output.
- Reliability: interrupted runs left in `running` after a crash/force-quit are
  reconciled to `failed` on startup (`reconcileInterruptedRuns`), and their
  linked still-running tasks are reset to `ready`, so the UI never shows a
  permanently stuck run.
- Reliability: spawn failures now persist a run `errorMessage`, surfaced
  prominently on the run detail screen instead of only being thrown to the
  caller.
- Reliability: the quality runner validates the project folder still exists and
  is a directory before spawning, returning a clear error if the workspace was
  moved or deleted.
- Verified all quality gates on Windows (Node 22): typecheck, lint (0 warnings),
  113 tests passing (30 files), and production build.
- Added `docs/audit.md` with the full codebase audit.

## Next Tasks

MVP feature phases are complete. Next work is portfolio packaging, manual demo rehearsal, and any follow-up hardening found during real CLI agent sessions.

## Current Risks

- node-pty setup on Windows can be tricky.
- Different CLI agents behave differently.
- Status detection from terminal output will be imperfect.
- Electron security must be handled carefully.
- Log storage can grow large.

## Notes

The first implementation should stay simple.

Do not build cloud sync, team collaboration, GitHub PR automation, or plugin system before the local MVP works.
