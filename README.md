# AgentDesk

AgentDesk is a Windows desktop app for managing coding agents such as Codex, OpenCode, Kiro CLI, Devin CLI, Claude Code, and custom CLI tools.

It acts as a local-first project manager for agentic software development.

Instead of opening many terminals manually, copying prompts, and tracking agent work in your head, AgentDesk gives you:

- project workspaces
- task breakdown
- agent-ready prompts
- embedded terminals
- terminal logs
- run history
- quality checks
- git diff tracking
- progress updates
- multi-agent review workflows

## Product Summary

AgentDesk helps developers break software projects into small, verifiable tasks and run those tasks through coding-agent CLI tools in a controlled desktop environment.

The main goal is not to replace coding agents.

The goal is to manage them.

## Core Workflow

```txt
Open local project folder
→ Generate or import project docs
→ Break project into tasks
→ Select a task
→ Choose an agent
→ Launch agent in embedded terminal
→ Track logs and file changes
→ Run quality checks
→ Review output
→ Commit or create follow-up fix task
→ Update progress
```

## MVP Scope

The first version focuses on local Windows development.

MVP features:

- Windows desktop app
- local project picker
- task board
- embedded terminal tabs
- agent profiles
- prompt generator
- run history
- quality command runner
- git status and diff viewer
- local SQLite storage

Out of scope for MVP:

- cloud sync
- team collaboration
- billing
- marketplace
- remote workers
- full GitHub PR automation
- plugin marketplace

## Recommended Stack

```txt
Desktop shell: Electron
Frontend: React + TypeScript
Terminal UI: xterm.js
PTY backend: node-pty
Local database: SQLite
ORM/query builder: Drizzle
Git integration: simple-git
State management: Zustand
Styling: Tailwind CSS
Packaging: electron-builder
```

## First Supported Platforms

- Windows 10
- Windows 11

Later:

- macOS
- Linux

## First Supported Agent Tools

- Codex CLI
- OpenCode
- Kiro CLI
- Devin CLI
- Claude Code
- Custom command

## First Supported Project Type

Start with JavaScript and TypeScript projects.

Default quality commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Later support:

- Python
- Flutter
- .NET
- Go
- Rust

## Repository Structure

```txt
agentdesk/
  apps/
    desktop/
      src/
        main/
          agents/
          db/
          git/
          ipc/
          pty/
          quality/
          shell/
        renderer/
          components/
          features/
          screens/
          stores/
          terminals/
  packages/
    core/
      agent-adapters/
      prompt-engine/
      task-engine/
      quality-gates/
    shared/
      types/
      schemas/
  docs/
    PRODUCT.md
    ARCHITECTURE.md
    TASKS.md
    SECURITY.md
    TESTING.md
    AGENTS.md
    PROMPTS.md
    PROGRESS.md
    DECISIONS.md
    KNOWN_ISSUES.md
```

## Development Principles

- Local-first.
- Human approval before destructive actions.
- Every agent run belongs to a task.
- Every task has acceptance criteria.
- Every implementation must pass quality checks.
- Terminal output must be logged.
- Git diff must be visible before commit.
- Agents should work on small bounded tasks.
- The user stays in control.

## MVP Success Criteria

The MVP is successful when a user can:

1. Open a local repo.
2. Create a task.
3. Generate an agent prompt.
4. Launch a CLI agent in an embedded terminal.
5. Save the terminal log.
6. Run project checks.
7. View changed files.
8. Mark the task done or create a fix task.
