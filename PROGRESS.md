# PROGRESS.md

## Project: AgentDesk

## Current Stage

Terminal engine implementation has started after the desktop foundation.

## MVP Definition

AgentDesk MVP is a Windows desktop app that can:

- open a local project
- create and manage tasks
- generate prompts
- launch CLI agents in embedded terminals
- save run logs
- run quality checks
- show git status and diffs
- track progress locally

## Completed

### Phase 1: Desktop App Foundation

- Completed TASK-0101: initialized the Electron, React, and TypeScript desktop app.
- Added a separated Electron main process, sandboxed preload bridge, and React renderer.
- Added root development, lint, typecheck, and production build scripts.
- Added the first desktop layout with sidebar, top bar, main content area, and renderer fallback UI.

### Terminal Engine

- Completed the initial node-pty backend for creating, writing to, resizing, and killing PTY sessions.
- Added safe terminal IPC through preload instead of exposing shell or Node access to the renderer.
- Added an xterm.js renderer panel with working-directory selection, terminal input, streamed output, resize forwarding, kill action, and visible error state.
- Added multi-tab terminal UI, PowerShell/CMD shell selection, IPC validation, secret redaction on streamed output, and close confirmation when sessions are active.
- Added terminal tests for default shell sizing logic and PTY session startup/output/exit behavior.

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

1. TASK-0503: Save Terminal Logs.
3. TASK-0102: Add Tailwind CSS and Base UI System.
4. TASK-0103: Add Local SQLite Database.

## Current Risks

- node-pty setup on Windows can be tricky.
- Different CLI agents behave differently.
- Status detection from terminal output will be imperfect.
- Electron security must be handled carefully.
- Log storage can grow large.

## Notes

The first implementation should stay simple.

Do not build cloud sync, team collaboration, GitHub PR automation, or plugin system before the local MVP works.
