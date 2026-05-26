# TASKS.md

## Task Statuses

```txt
backlog
ready
running
needs_review
failed
blocked
done
```

## Phase 0: Product Foundation

### TASK-0001: Confirm MVP Scope

Status: done

Goal:
Define the first version of AgentDesk as a local-first Windows desktop app for managing coding-agent CLI tools.

Acceptance Criteria:

- MVP features are clearly listed.
- Out-of-scope features are listed.
- First supported tools are listed.
- First supported project type is listed.

---

## Phase 1: Desktop App Foundation

### TASK-0101: Initialize Electron React TypeScript App

Status: done

Goal:
Create the initial desktop application using Electron, React, and TypeScript.

Acceptance Criteria:

- Electron app launches on Windows.
- React renderer loads successfully.
- TypeScript is configured.
- Main process and renderer process are separated.
- App has basic layout with sidebar and main content area.
- Development command works.
- Production build command works.

Quality Commands:

```bash
npm run lint
npm run typecheck
npm run build
```

---

### TASK-0102: Add Tailwind CSS and Base UI System

Status: done

Goal:
Set up Tailwind CSS and create basic reusable UI components.

Acceptance Criteria:

- Tailwind works in renderer.
- App has light/dark-ready theme variables.
- Reusable Button, Card, Input, Dialog, Tabs, and Badge components exist.
- Layout uses consistent spacing.
- UI works at 1366x768 and 1920x1080.

---

### TASK-0103: Add Local SQLite Database

Status: done

Goal:
Add SQLite local database for storing projects, tasks, agent profiles, runs, and logs.

Acceptance Criteria:

- SQLite database is created in app data folder.
- Database schema includes projects, tasks, agent_profiles, agent_runs, terminal_logs, and quality_checks.
- Migrations are repeatable.
- App can read/write sample data.
- Database errors are handled safely.

---

## Phase 2: Project Workspace

### TASK-0201: Implement Project Folder Picker

Status: done

Goal:
Allow users to select a local project folder.

Acceptance Criteria:

- User can choose a folder using native dialog.
- App stores selected project path.
- App displays project name.
- App validates folder exists.
- App prevents duplicate project entries.

---

### TASK-0202: Detect Project Metadata

Status: done

Goal:
Detect package manager, framework, scripts, and git status.

Acceptance Criteria:

- Detects package.json.
- Detects npm, pnpm, yarn, or bun.
- Reads scripts from package.json.
- Detects git repo.
- Detects current branch.
- Shows detected metadata in UI.

---

### TASK-0203: Project Overview Screen

Status: done

Goal:
Create project overview page.

Acceptance Criteria:

- Shows project path.
- Shows package manager.
- Shows git branch.
- Shows task summary.
- Shows recent runs.
- Shows next recommended task.

---

## Phase 3: Task Board

### TASK-0301: Create Task CRUD

Status: done

Goal:
Allow users to create, edit, delete, and view tasks.

Acceptance Criteria:

- User can create a task.
- User can edit title, description, status, priority, acceptance criteria, quality commands, and security notes.
- User can delete a task after confirmation.
- Tasks are stored in SQLite.
- Tasks are grouped by status.

---

### TASK-0302: Build Kanban Task Board

Status: done

Goal:
Create the main task board.

Acceptance Criteria:

- Columns: Backlog, Ready, Running, Needs Review, Failed, Done.
- Tasks are shown as cards.
- User can change task status.
- User can open task detail panel.
- Board state persists.

---

### TASK-0303: Add Task Contract Template

Status: done

Goal:
Add structured task contract fields.

Acceptance Criteria:

Each task supports:

- goal
- context
- acceptance criteria
- files likely affected
- quality commands
- security requirements
- done definition

---

## Phase 4: Prompt Engine

### TASK-0401: Implement Prompt Template System

Status: done

Goal:
Create reusable prompt templates.

Acceptance Criteria:

- Implementation prompt template exists.
- Review prompt template exists.
- Fix prompt template exists.
- Test prompt template exists.
- Security prompt template exists.
- Templates can inject project and task data.

---

### TASK-0402: Generate Implementation Prompt from Task

Status: done

Goal:
Generate a high-quality agent prompt for a selected task.

Acceptance Criteria:

- Prompt includes project name.
- Prompt includes task goal.
- Prompt includes acceptance criteria.
- Prompt includes quality commands.
- Prompt includes files to read first.
- Prompt includes rules to avoid unrelated edits.
- User can copy prompt.

---

### TASK-0403: Generate Review and Fix Prompts

Status: done

Goal:
Generate review and fix prompts for agent output.

Acceptance Criteria:

- Review prompt checks acceptance criteria, security, tests, architecture, and unrelated changes.
- Fix prompt includes failed checks and required corrections. (Manual fix context field until Phase 7 quality results are linked automatically.)
- User can copy prompts or send them to terminal. (Long sends require confirmation; delivery copies to clipboard and writes line by line.)

---

## Phase 5: Terminal Engine

### TASK-0501: Add node-pty Terminal Backend

Status: done

Goal:
Create PTY sessions from the Electron main process.

Acceptance Criteria:

- Can launch PowerShell.
- Can launch CMD.
- Can set working directory.
- Can send input.
- Can receive output.
- Can kill process.
- Can resize terminal.

---

### TASK-0502: Add xterm.js Renderer

Status: done

Goal:
Display terminal sessions in the renderer.

Acceptance Criteria:

- Terminal renders correctly.
- ANSI output works.
- User can type into terminal.
- Terminal resizes with window.
- Multiple terminal tabs are supported.

---

### TASK-0503: Save Terminal Logs

Status: done

Goal:
Save terminal output to database per run.

Acceptance Criteria:

- Output chunks are stored.
- Logs are linked to agent run.
- User can view transcript.
- User can export transcript.
- Large logs do not freeze UI.

---

## Phase 6: Agent Profiles

### TASK-0601: Create Agent Profile Data Model

Status: done

Goal:
Allow users to define CLI agent tools.

Acceptance Criteria:

Profile fields:

- name
- command
- args template
- shell
- mode
- environment variables
- working directory behavior

---

### TASK-0602: Add Default Agent Profiles

Status: done

Goal:
Provide default profiles for common tools.

Acceptance Criteria:

Default profiles exist for:

- Codex
- OpenCode
- Kiro CLI
- Devin CLI
- Claude Code
- Custom Command

Each profile can be edited by the user.

---

### TASK-0603: Launch Agent from Task

Status: done

Goal:
Run a selected task with a selected agent profile.

Acceptance Criteria:

- User selects task.
- User selects agent.
- App builds command.
- App launches terminal session in project folder.
- Run is linked to task.
- Prompt is copied or sent depending on profile mode.
- Run status is stored.

---

## Phase 7: Quality Checks

### TASK-0701: Configure Quality Commands

Status: done

Goal:
Allow users to configure per-project quality commands.

Acceptance Criteria:

- User can add/edit/remove commands.
- Commands have label, command, required flag, and timeout.
- Defaults are detected from package.json where possible.

---

### TASK-0702: Run Quality Checks

Status: done

Goal:
Run quality commands and capture results.

Acceptance Criteria:

- User can run all checks.
- Each check captures output and exit code.
- Pass/fail result is displayed.
- Failed command output is visible.
- Results are linked to task and run.

---

### TASK-0703: Create Fix Task from Failed Check

Status: done

Goal:
Create a follow-up task from failed checks.

Acceptance Criteria:

- User can click "Create Fix Task."
- Fix task includes failed command output.
- Fix task includes original task context.
- Fix prompt can be generated.

---

## Phase 8: Git Integration

### TASK-0801: Show Git Status

Status: done

Goal:
Display current git state.

Acceptance Criteria:

- Shows current branch.
- Shows changed files.
- Shows staged and unstaged files.
- Handles non-git folder gracefully.

---

### TASK-0802: Add Diff Viewer

Status: done

Goal:
Show git diff for changed files.

Acceptance Criteria:

- User can select changed file.
- Diff is displayed.
- Large diffs are handled.
- Binary files are shown as unsupported.

---

### TASK-0803: Create Branch and Commit

Status: done

Goal:
Support basic branch and commit workflow.

Acceptance Criteria:

- User can create branch from task.
- User can stage selected files.
- User can commit with generated message.
- App asks confirmation before commit.
- App does not push automatically in MVP.

---

## Phase 9: Documents and Progress

### TASK-0901: Generate Project Docs

Status: done

Goal:
Create default markdown docs in the project.

Acceptance Criteria:

Creates:

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

---

### TASK-0902: Update PROGRESS.md from Task Status

Status: done

Goal:
Sync task progress to markdown.

Acceptance Criteria:

- Task status changes can update PROGRESS.md.
- Run summary is added.
- Quality result is added.
- User can preview before writing.

---

## Phase 10: Polish and Portfolio Readiness

### TASK-1001: Add Keyboard Shortcuts

Status: backlog

Goal:
Improve speed for power users.

Acceptance Criteria:

Shortcuts for:

- open command palette
- create task
- launch agent
- run checks
- open terminal
- switch tabs

---

### TASK-1002: Add Agent Run Detail Screen

Status: backlog

Goal:
Create a detailed run report page.

Acceptance Criteria:

Shows:

- task
- agent
- command
- prompt
- transcript
- changed files
- quality results
- notes
- duration

---

### TASK-1003: Build Demo Project Flow

Status: backlog

Goal:
Create a portfolio-ready demo workflow.

Acceptance Criteria:

Demo shows:

- open repo
- create task
- launch agent
- capture logs
- run checks
- show diff
- mark task done
