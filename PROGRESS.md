# PROGRESS.md

## Project: AgentDesk

## Current Stage

Planning complete. Ready for Phase 1 implementation.

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

Start Phase 1:

1. TASK-0101: Initialize Electron React TypeScript App
2. TASK-0102: Add Tailwind CSS and Base UI System
3. TASK-0103: Add Local SQLite Database

## Current Risks

- node-pty setup on Windows can be tricky.
- Different CLI agents behave differently.
- Status detection from terminal output will be imperfect.
- Electron security must be handled carefully.
- Log storage can grow large.

## Notes

The first implementation should stay simple.

Do not build cloud sync, team collaboration, GitHub PR automation, or plugin system before the local MVP works.
