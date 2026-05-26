# GOAL_COMMANDS.md

This file contains phase-by-phase `/goal` commands for coding agents.

## How to Use

1. Start a new branch for the phase.
2. Open your coding agent.
3. Paste the relevant `/goal` command.
4. Let the agent implement.
5. Run the quality check prompt.
6. Run the code review prompt.
7. Use the fix prompt for gaps.
8. Update PROGRESS.md.

---

## Phase 1: Desktop App Foundation

```txt
/goal

Implement TASK-0101, TASK-0102, and TASK-0103 from TASKS.md.

Focus:
- Electron + React + TypeScript foundation
- Tailwind setup
- safe preload API
- SQLite setup if practical

Read:
- README.md
- ARCHITECTURE.md
- SECURITY.md
- TESTING.md
- AGENTS.md
- TASKS.md

Rules:
- Keep Electron secure.
- Do not implement terminal engine yet unless required by setup.
- Keep architecture clean.
- Add scripts for dev, lint, typecheck, test, and build.

Run:
- npm run lint
- npm run typecheck
- npm test
- npm run build

Return:
- summary
- files changed
- commands run
- risks
```

---

## Phase 2: Project Workspace

```txt
/goal

Implement TASK-0201, TASK-0202, and TASK-0203 from TASKS.md.

Focus:
- project folder picker
- project metadata detection
- project overview screen

Requirements:
- Use Electron native dialog from main process.
- Store projects locally.
- Detect package.json, package manager, scripts, git repo, and branch.
- Handle invalid folders.
- Prevent duplicate projects.

Run:
- npm run lint
- npm run typecheck
- npm test
- npm run build

Return:
- summary
- files changed
- commands run
- risks
```

---

## Phase 3: Task Board

```txt
/goal

Implement TASK-0301, TASK-0302, and TASK-0303 from TASKS.md.

Focus:
- task CRUD
- kanban board
- task contract template

Requirements:
- Persist tasks locally.
- Add task detail panel.
- Support acceptance criteria and quality commands.
- Support statuses: backlog, ready, running, needs_review, failed, blocked, done.

Run:
- npm run lint
- npm run typecheck
- npm test
- npm run build

Return:
- summary
- files changed
- commands run
- risks
```

---

## Phase 4: Prompt Engine

```txt
/goal

Implement TASK-0401, TASK-0402, and TASK-0403 from TASKS.md.

Focus:
- implementation prompt
- review prompt
- fix prompt
- copy/send prompt UI

Requirements:
- Prompt engine should be pure TypeScript.
- Templates should inject task and project context.
- Include acceptance criteria and quality commands.
- Include architecture and security rules.
- Add preview UI.
- Add copy button.
- Add send-to-terminal button if active terminal exists.

Run:
- npm run lint
- npm run typecheck
- npm test
- npm run build

Return:
- summary
- files changed
- commands run
- risks
```

---

## Phase 5: Terminal Engine

```txt
/goal

Implement TASK-0501, TASK-0502, and TASK-0503 from TASKS.md.

Focus:
- node-pty backend
- xterm.js renderer
- terminal tabs
- log capture

Requirements:
- PTY must run only in Electron main process.
- Renderer receives output through safe IPC.
- User can type into terminal.
- User can kill terminal.
- Terminal starts in selected working directory.
- PowerShell should be default shell on Windows.
- Terminal logs are chunked, stored, viewable, and exportable.

Run:
- npm run lint
- npm run typecheck
- npm test
- npm run build

Manual checks:
- open terminal
- run node -v
- run npm -v
- kill terminal
- reopen terminal
- view/export transcript

Return:
- summary
- files changed
- commands run
- manual test result
- risks
```

---

## Phase 6: Agent Profiles

```txt
/goal

Implement TASK-0601, TASK-0602, and TASK-0603 from TASKS.md.

Focus:
- agent profile system
- default profiles
- launch agent from task

Requirements:
- Add profiles for Codex, OpenCode, Kiro CLI, Devin CLI, Claude Code, and Custom Command.
- Command preview before launch.
- User confirmation before launch.
- Launch happens through terminal engine.
- Run is linked to task.
- Terminal log is linked to run.

Run:
- npm run lint
- npm run typecheck
- npm test
- npm run build

Return:
- summary
- files changed
- commands run
- risks
```

---

## Phase 7: Quality Checks

```txt
/goal

Implement TASK-0701, TASK-0702, and TASK-0703 from TASKS.md.

Focus:
- quality command configuration
- run checks
- capture results
- create fix task from failure

Requirements:
- Run commands in project folder.
- Capture stdout/stderr/exit code.
- Link checks to task and run.
- Display pass/fail clearly.
- Add failed-check summary.
- Generate fix task from failure.

Run:
- npm run lint
- npm run typecheck
- npm test
- npm run build

Return:
- summary
- files changed
- commands run
- risks
```

---

## Phase 8: Git Integration

```txt
/goal

Implement TASK-0801, TASK-0802, and TASK-0803 from TASKS.md.

Focus:
- git status
- diff viewer
- branch and commit workflow

Requirements:
- Show current branch.
- Show changed files.
- Show diff for selected file.
- Create task branch.
- Stage selected files.
- Commit with editable message.
- Ask confirmation before commit.
- Do not push automatically.

Run:
- npm run lint
- npm run typecheck
- npm test
- npm run build

Return:
- summary
- files changed
- commands run
- risks
```

---

## Phase 9: Documents and Progress

```txt
/goal

Implement TASK-0901 and TASK-0902 from TASKS.md.

Focus:
- generate markdown docs
- update PROGRESS.md from task status and run results

Requirements:
- Create default docs in project.
- Preview file writes before applying.
- Update PROGRESS.md when task is completed.
- Include run summary and quality result.
- Do not overwrite user docs without confirmation.

Run:
- npm run lint
- npm run typecheck
- npm test
- npm run build

Return:
- summary
- files changed
- commands run
- risks
```

---

## Phase 10: Polish and Portfolio Readiness

```txt
/goal

Implement TASK-1001, TASK-1002, and TASK-1003 from TASKS.md.

Focus:
- keyboard shortcuts
- agent run detail screen
- portfolio-ready demo flow

Requirements:
- Add useful shortcuts.
- Add run detail page.
- Improve empty states.
- Improve error states.
- Add clear demo path.
- Keep UI fast and readable.

Run:
- npm run lint
- npm run typecheck
- npm test
- npm run build

Return:
- summary
- files changed
- commands run
- risks
```
