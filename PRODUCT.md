# PRODUCT.md

## Product Name

AgentDesk

## One-Line Description

A Windows desktop project manager for coding agents that turns local development work into task-based, logged, reviewed, and quality-checked agent runs.

## Problem

Developers are increasingly using coding agents through CLI tools such as Codex, OpenCode, Kiro CLI, Devin CLI, Claude Code, and custom scripts.

The problem is that the workflow becomes messy quickly:

- too many terminals
- unclear task ownership
- repeated prompt writing
- lost context
- no run history
- no quality gate
- no consistent task breakdown
- no clear connection between task, prompt, terminal output, git diff, and result
- hard to compare agents
- hard to know what was done and what failed

## Target User

Primary user:

- solo developer
- student developer
- indie hacker
- AI-assisted developer
- developer building projects with CLI agents
- power user who uses Cursor, Codex, OpenCode, Claude Code, or similar tools

Secondary user:

- small dev team
- technical founder
- open-source maintainer
- teacher or mentor managing student projects

## User Persona

### Persona 1: Agentic Builder

The user builds apps using coding agents. They brainstorm with ChatGPT or Claude, generate project documents, then use CLI tools to implement tasks.

Needs:

- structured task breakdown
- better prompts
- less context switching
- clear progress tracking
- terminal management
- quality checks

### Persona 2: Local-First Developer

The user wants AI help but does not want every workflow to live in the cloud.

Needs:

- local repo access
- local command execution
- local logs
- no forced SaaS workflow
- control over API keys and tools

### Persona 3: Agent Evaluator

The user wants to compare different coding agents.

Needs:

- run same task with different tools
- compare logs
- compare git diffs
- compare test results
- compare success rate

## Product Goals

AgentDesk should help the user:

1. Break software goals into small implementation tasks.
2. Run coding agents from a desktop UI.
3. Manage many embedded terminal sessions.
4. Track agent logs and outputs.
5. Verify agent work with quality commands.
6. View file changes and git diffs.
7. Keep project docs and progress updated.
8. Compare agent performance over time.

## Non-Goals

AgentDesk should not initially:

- replace VS Code or Cursor
- become a full IDE
- become a cloud SaaS
- automate merges without user approval
- execute destructive commands silently
- require one specific AI provider
- hide terminal behavior from the user

## Core Value Proposition

AgentDesk gives structure and control to agentic coding.

The unique value is:

```txt
Task → Prompt → Agent Run → Terminal Log → Git Diff → Quality Check → Review → Progress
```

Most tools focus on the agent.

AgentDesk focuses on the workflow around the agent.

## Core Features

### 1. Project Workspaces

A project workspace represents one local codebase.

Each workspace stores:

- folder path
- project name
- tech stack
- package manager
- git status
- quality commands
- linked docs
- tasks
- agent runs
- run history

### 2. Task Board

A kanban-style task board with statuses:

- Backlog
- Ready
- Running
- Needs Review
- Failed
- Done
- Blocked

Each task includes:

- title
- description
- goal
- acceptance criteria
- agent prompt
- quality commands
- security notes
- dependencies
- run history

### 3. Agent Profiles

Agent profiles define how each CLI tool launches.

Example profiles:

- Codex
- OpenCode
- Kiro CLI
- Devin CLI
- Claude Code
- Custom Command

Each profile stores:

- command
- arguments
- working directory behavior
- shell type
- prompt injection mode
- status parsing rules
- environment variables

### 4. Embedded Terminal

The app uses a real pseudo-terminal so CLI tools work correctly.

Features:

- terminal tabs
- terminal grid
- kill/restart process
- copy logs
- save transcript
- send generated prompt
- detect waiting-for-input state

### 5. Prompt Generator

Generates prompts from task contracts.

Prompt types:

- implementation prompt
- review prompt
- fix prompt
- test prompt
- security prompt
- UI/UX improvement prompt
- documentation prompt

### 6. Quality Gate

Runs configured commands after an agent run.

Examples:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Shows:

- pass
- fail
- skipped
- command output
- duration
- error summary

### 7. Git Integration

Shows:

- current branch
- changed files
- staged files
- unstaged files
- diff
- commits
- branch creation

MVP should support:

- create branch
- view diff
- commit changes
- discard selected changes only after confirmation

### 8. Run History

Every agent run is stored with:

- task
- agent
- command
- prompt
- transcript
- start time
- end time
- status
- changed files
- quality results
- notes

## User Journey

### New Project Journey

1. User opens AgentDesk.
2. User selects a local folder.
3. AgentDesk detects project type.
4. User creates project docs or imports existing docs.
5. User creates tasks.
6. User chooses a task and agent.
7. Agent runs in embedded terminal.
8. User runs quality checks.
9. User reviews git diff.
10. User marks task done or sends back for fixes.

### Existing Repo Journey

1. User opens existing repo.
2. AgentDesk scans scripts and git status.
3. User creates a cleanup/audit task.
4. Agent runs review.
5. AgentDesk creates follow-up tasks.
6. User implements tasks one by one.

## MVP Acceptance Criteria

The MVP is complete when:

- a Windows user can install the app
- the user can open a local project
- the user can create and edit tasks
- the user can configure at least one agent command
- the user can launch an embedded terminal
- the user can send a generated prompt to the terminal
- the terminal transcript is saved
- quality checks can be run
- git status and diff are visible
- task status can be updated
