# ARCHITECTURE.md

## Architecture Overview

AgentDesk is a local-first Windows desktop app built with Electron, React, TypeScript, SQLite, xterm.js, and node-pty.

The app has three main layers:

```txt
Renderer UI
→ Electron Main Process
→ Local System Integrations
```

## High-Level Diagram

```txt
┌────────────────────────────────────────────┐
│              React Renderer UI             │
│  Task board, terminals, docs, settings     │
└─────────────────────┬──────────────────────┘
                      │ IPC
                      ▼
┌────────────────────────────────────────────┐
│            Electron Main Process            │
│  filesystem, database, git, PTY, agents     │
└───────┬─────────────┬─────────────┬────────┘
        │             │             │
        ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│ node-pty     │ │ SQLite   │ │ simple-git   │
│ terminals    │ │ database │ │ git manager  │
└──────┬───────┘ └──────────┘ └──────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│       CLI Coding Agents and Shells          │
│ Codex, OpenCode, Kiro, Devin, PowerShell    │
└────────────────────────────────────────────┘
```

## Main Technology Choices

### Electron

Used because the app needs:

- native desktop packaging
- local filesystem access
- process spawning
- terminal/PTY support
- Windows shell integration
- access to Node.js ecosystem

### React

Used for the renderer UI.

### TypeScript

Used across main process, renderer, and shared packages.

### xterm.js

Used to render terminal sessions inside the UI.

### node-pty

Used to create real pseudo-terminal sessions.

This is required because many coding-agent CLIs use interactive terminal behavior.

### SQLite

Used for local app data:

- projects
- tasks
- agent runs
- logs
- settings

### Drizzle

Recommended for database schema and type-safe queries.

### simple-git

Used for git operations.

## Process Model

### Renderer Process

Responsible for:

- UI rendering
- task board
- terminal component
- docs editor
- settings pages
- run history pages

The renderer must not directly access filesystem, shell, git, or database.

It communicates through IPC.

### Main Process

Responsible for:

- opening project folders
- reading and writing files
- launching terminal processes
- managing PTY sessions
- running git commands
- storing logs
- running quality checks
- managing application windows

### Preload Layer

Responsible for exposing safe APIs to the renderer.

Example:

```ts
window.agentdesk.projects.openFolder()
window.agentdesk.tasks.createTask()
window.agentdesk.terminals.createSession()
window.agentdesk.git.getStatus()
```

The renderer should never receive unrestricted Node.js access.

## Core Modules

## 1. Project Module

Path:

```txt
apps/desktop/src/main/projects
```

Responsibilities:

- create project
- open project
- detect project metadata
- read package.json
- detect git repo
- detect package manager
- store project settings

Detection rules:

- `package.json` means Node project
- `pnpm-lock.yaml` means pnpm
- `yarn.lock` means yarn
- `package-lock.json` means npm
- `.git` means git repo
- `vite.config.*` means Vite
- `next.config.*` means Next.js

## 2. Task Module

Path:

```txt
packages/core/task-engine
```

Responsibilities:

- create task
- update task
- change task status
- manage dependencies
- link task to agent run
- generate task contracts

Task status enum:

```ts
type TaskStatus =
  | "backlog"
  | "ready"
  | "running"
  | "needs_review"
  | "failed"
  | "blocked"
  | "done";
```

## 3. Prompt Engine

Path:

```txt
packages/core/prompt-engine
```

Responsibilities:

- create implementation prompt
- create review prompt
- create fix prompt
- create test prompt
- create security prompt
- inject project context
- inject task acceptance criteria

Prompt templates should be stored as versioned files or records.

## 4. Agent Adapter Module

Path:

```txt
packages/core/agent-adapters
```

Responsibilities:

- define agent profile interface
- build agent commands
- parse agent output
- detect waiting-for-input states
- support custom tools

Adapter interface:

```ts
export interface AgentAdapter {
  id: string;
  name: string;
  mode: "interactive" | "one_shot" | "both";
  buildCommand(input: AgentLaunchInput): AgentCommand;
  parseOutput?(text: string): AgentOutputSignal[];
}
```

Agent command:

```ts
export interface AgentCommand {
  executable: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
  shell?: "powershell" | "cmd" | "git-bash" | "wsl";
}
```

MVP adapters:

- CodexAdapter
- OpenCodeAdapter
- KiroAdapter
- DevinAdapter
- CustomCommandAdapter

## 5. PTY Terminal Module

Path:

```txt
apps/desktop/src/main/pty
```

Responsibilities:

- create PTY session
- write user input
- stream output
- resize terminal
- kill session
- save transcript
- attach session to task/run

Session lifecycle:

```txt
created
→ running
→ waiting_for_input
→ completed
→ failed
→ killed
```

## 6. Quality Module

Path:

```txt
apps/desktop/src/main/quality
```

Responsibilities:

- run quality commands
- capture output
- store results
- summarize failures
- create fix task

Quality command model:

```ts
export interface QualityCommand {
  id: string;
  label: string;
  command: string;
  required: boolean;
  timeoutMs?: number;
}
```

Default Node commands:

```txt
npm run lint
npm run typecheck
npm test
npm run build
```

The app must allow users to edit these per project.

## 7. Git Module

Path:

```txt
apps/desktop/src/main/git
```

Responsibilities:

- get status
- get current branch
- create branch
- list changed files
- show diff
- commit changes
- stash changes
- discard changes after confirmation

MVP should not auto-push unless the user explicitly requests it.

## 8. Document Module

Path:

```txt
apps/desktop/src/main/documents
```

Responsibilities:

- read project docs
- create default docs
- update PROGRESS.md
- update TASKS.md
- write AGENTS.md
- sync task changes to markdown if enabled

## Database Schema

Use SQLite.

Tables:

### projects

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  repo_url TEXT,
  default_branch TEXT,
  package_manager TEXT,
  tech_stack TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### tasks

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  priority TEXT,
  acceptance_criteria TEXT,
  quality_commands TEXT,
  security_notes TEXT,
  depends_on TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
```

### agent_profiles

```sql
CREATE TABLE agent_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  args_template TEXT,
  mode TEXT NOT NULL,
  shell TEXT,
  env_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### agent_runs

```sql
CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  task_id TEXT,
  agent_profile_id TEXT,
  command TEXT NOT NULL,
  prompt TEXT,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  exit_code INTEGER,
  branch_name TEXT,
  summary TEXT,
  error_message TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);
```

### terminal_logs

```sql
CREATE TABLE terminal_logs (
  id TEXT PRIMARY KEY,
  agent_run_id TEXT NOT NULL,
  chunk TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(agent_run_id) REFERENCES agent_runs(id)
);
```

### quality_checks

```sql
CREATE TABLE quality_checks (
  id TEXT PRIMARY KEY,
  agent_run_id TEXT,
  project_id TEXT NOT NULL,
  task_id TEXT,
  label TEXT NOT NULL,
  command TEXT NOT NULL,
  status TEXT NOT NULL,
  output TEXT,
  exit_code INTEGER,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  FOREIGN KEY(agent_run_id) REFERENCES agent_runs(id)
);
```

## IPC API Design

Expose narrow APIs.

Example channels:

```txt
project:create
project:list
project:open-folder
project:detect

task:create
task:update
task:list
task:set-status

terminal:create
terminal:write
terminal:resize
terminal:kill
terminal:on-output

agent:list-profiles
agent:create-profile
agent:launch

quality:run
quality:list

git:status
git:diff
git:create-branch
git:commit
```

## Security Architecture

Rules:

- renderer has no direct Node.js access
- all filesystem access goes through main process
- only allow operations inside selected project folders
- confirm destructive operations
- redact secrets from logs
- do not store raw API keys without encryption
- never auto-run unknown commands without showing them
- never auto-commit without user confirmation

## Error Handling

Every long-running operation must return:

- status
- error message
- logs
- retry option

Examples:

- agent command not found
- project path missing
- git not installed
- package manager not installed
- terminal process failed
- quality command timed out
- permission denied
- shell unavailable

## Performance Notes

Terminal logs can become large.

Use chunked logging:

- store terminal output in chunks
- lazy-load logs
- truncate UI display after safe limit
- allow export full transcript

## Future Architecture

Later versions can add:

- cloud sync
- GitHub App integration
- remote runners
- plugin system
- MCP configuration manager
- agent comparison engine
- local LLM planning
- workspace sharing
