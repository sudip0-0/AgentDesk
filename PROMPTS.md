# PROMPTS.md

This file contains reusable prompts for building AgentDesk with coding agents.

Use these prompts with Codex, OpenCode, Cursor, Claude Code, Kiro CLI, Devin, or similar tools.

---

# 1. Universal Implementation /goal Prompt

Use this for each implementation phase.

```txt
/goal

You are an expert senior software engineer working on AgentDesk.

Project:
AgentDesk is a Windows desktop app for managing coding-agent CLI tools such as Codex, OpenCode, Kiro CLI, Devin CLI, Claude Code, and custom commands.

Core idea:
Every coding-agent run should be attached to a task, prompt, terminal log, quality result, git diff, and progress update.

Read these files before making changes:
- README.md
- PRODUCT.md
- ARCHITECTURE.md
- TASKS.md
- SECURITY.md
- TESTING.md
- AGENTS.md
- PROGRESS.md

Task:
[PASTE TASK ID AND TITLE HERE]

Task details:
[PASTE TASK CONTRACT FROM TASKS.md HERE]

Rules:
1. Implement only this task.
2. Do not rewrite unrelated files.
3. Respect architecture boundaries.
4. Renderer must not directly access Node.js, filesystem, database, shell, or git.
5. Main process owns native/system operations.
6. Use IPC through safe preload APIs.
7. Add or update tests where practical.
8. Handle loading, empty, error, and failure states.
9. Keep Windows compatibility in mind.
10. Do not remove security confirmations.
11. Do not commit secrets.
12. Do not fake passing checks.

Quality commands to run:
- npm run lint
- npm run typecheck
- npm test
- npm run build

If a command does not exist, report that clearly.

Expected output:
- Summary of what you changed
- Files changed
- Commands run and results
- Any known risks
- Suggested follow-up tasks
```

---

# 2. Phase 1 /goal Prompt: Desktop Foundation

```txt
/goal

Implement Phase 1: Desktop App Foundation for AgentDesk.

Read:
- README.md
- ARCHITECTURE.md
- TASKS.md
- SECURITY.md
- TESTING.md
- AGENTS.md

Goal:
Create the initial Electron + React + TypeScript app structure.

Requirements:
1. Electron app launches on Windows.
2. React renderer loads successfully.
3. Main process and renderer process are separated.
4. Preload file exists and exposes a minimal safe API.
5. TypeScript is configured.
6. Basic app layout exists:
   - sidebar
   - top bar
   - main content area
7. Add development, lint, typecheck, and build scripts.
8. Add basic error boundary or fallback UI.
9. Keep Electron security settings safe:
   - nodeIntegration false
   - contextIsolation true
   - preload enabled

Do not implement terminal, SQLite, git, or agent profiles yet.

Quality commands:
- npm run lint
- npm run typecheck
- npm run build

Return:
- summary
- files changed
- commands run
- risks
```

---

# 3. Phase 2 /goal Prompt: Terminal Engine

```txt
/goal

Implement Phase 2: Terminal Engine.

Goal:
Add embedded terminal support using node-pty in the Electron main process and xterm.js in the React renderer.

Requirements:
1. Main process can create PTY sessions.
2. Renderer displays terminal output using xterm.js.
3. User can type into the terminal.
4. Terminal starts in selected working directory.
5. Terminal supports PowerShell as default shell on Windows.
6. Terminal can be resized.
7. Terminal can be killed.
8. Terminal output is streamed through safe IPC.
9. Terminal errors are shown in UI.
10. No direct shell access from renderer.

Architecture rules:
- node-pty must only run in main process.
- renderer talks to terminal through preload IPC API.
- terminal session IDs must be tracked.
- cleanup processes when app closes.

Quality commands:
- npm run lint
- npm run typecheck
- npm test
- npm run build

Return:
- summary
- files changed
- commands run
- manual test steps
- risks
```

---

# 4. Phase 3 /goal Prompt: Project Workspace

```txt
/goal

Implement Phase 3: Project Workspace.

Goal:
Allow users to select a local project folder and detect basic project metadata.

Requirements:
1. Add project folder picker using Electron native dialog.
2. Store selected project in local app state or database if database exists.
3. Detect:
   - package.json
   - package manager
   - scripts
   - git repo
   - current branch
4. Show project overview screen.
5. Handle invalid folders safely.
6. Prevent duplicate project entries.
7. Restrict project file operations to selected folder.

Quality commands:
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

# 5. Phase 4 /goal Prompt: Task Board

```txt
/goal

Implement Phase 4: Task Board.

Goal:
Create task management for AgentDesk.

Requirements:
1. Add task data model.
2. Create task CRUD.
3. Create kanban board with columns:
   - Backlog
   - Ready
   - Running
   - Needs Review
   - Failed
   - Done
4. Add task detail panel.
5. Task fields:
   - title
   - description
   - status
   - priority
   - goal
   - acceptance criteria
   - quality commands
   - security notes
   - done definition
6. Persist tasks locally.
7. Allow changing task status.
8. Add empty states.

Quality commands:
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

# 6. Phase 5 /goal Prompt: Agent Profiles

```txt
/goal

Implement Phase 5: Agent Profiles.

Goal:
Allow users to configure coding-agent CLI tools.

Requirements:
1. Add agent profile data model.
2. Add default profiles for:
   - Codex
   - OpenCode
   - Kiro CLI
   - Devin CLI
   - Claude Code
   - Custom Command
3. Profile fields:
   - name
   - command
   - args template
   - shell
   - mode: interactive or one-shot
   - environment variables
   - working directory behavior
4. Add UI to create/edit/delete profiles.
5. Add command preview before launch.
6. Do not execute commands silently.
7. Validate empty or unsafe profile fields.

Quality commands:
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

# 7. Phase 6 /goal Prompt: Prompt Engine

```txt
/goal

Implement Phase 6: Prompt Engine.

Goal:
Generate strong prompts from project and task context.

Requirements:
1. Create prompt-engine module.
2. Add implementation prompt template.
3. Add review prompt template.
4. Add fix prompt template.
5. Add test prompt template.
6. Add security prompt template.
7. Inject task fields into prompts.
8. Add copy prompt button.
9. Add send prompt to active terminal button.
10. Add prompt preview UI.

Prompt rules:
- Include task ID and goal.
- Include acceptance criteria.
- Include quality commands.
- Include files/docs to read first.
- Tell the agent not to edit unrelated files.
- Tell the agent to report checks honestly.

Quality commands:
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

# 8. Phase 7 /goal Prompt: Run Task with Agent

```txt
/goal

Implement Phase 7: Run Task with Agent.

Goal:
Allow a user to launch a selected task using a selected agent profile.

Requirements:
1. User selects task.
2. User selects agent profile.
3. App builds command from profile.
4. App shows command preview.
5. User confirms launch.
6. App creates agent run record.
7. App opens terminal session in project folder.
8. App sends prompt if profile supports one-shot or send-prompt mode.
9. Terminal logs are linked to run.
10. Task status changes to Running.
11. When process exits, run status is updated.

Security:
- show command before launch
- do not run hidden commands
- renderer must not directly spawn process

Quality commands:
- npm run lint
- npm run typecheck
- npm test
- npm run build

Return:
- summary
- files changed
- commands run
- manual test steps
- risks
```

---

# 9. Phase 8 /goal Prompt: Quality Checks

```txt
/goal

Implement Phase 8: Quality Checks.

Goal:
Run project quality commands and store results.

Requirements:
1. Add quality command configuration per project.
2. Add default Node commands:
   - npm run lint
   - npm run typecheck
   - npm test
   - npm run build
3. Allow user to edit commands.
4. Run commands in project folder.
5. Capture stdout, stderr, exit code, start time, end time.
6. Show pass/fail/skipped result.
7. Link result to task and agent run if available.
8. Add button to create fix task from failed check.
9. Add timeout support or clear TODO for timeout implementation.

Quality commands:
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

# 10. Phase 9 /goal Prompt: Git Integration

```txt
/goal

Implement Phase 9: Git Integration.

Goal:
Show git status and diffs for the current project.

Requirements:
1. Detect if folder is a git repo.
2. Show current branch.
3. Show changed files.
4. Show staged and unstaged files.
5. Show diff for selected file.
6. Allow creating branch from task.
7. Allow staging selected files.
8. Allow commit with editable generated message.
9. Ask confirmation before commit.
10. Do not push automatically in MVP.
11. Handle non-git folders gracefully.

Quality commands:
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

# 11. Code Review Prompt

```txt
You are a senior code reviewer for AgentDesk.

Review the current implementation carefully.

Read:
- README.md
- PRODUCT.md
- ARCHITECTURE.md
- TASKS.md
- SECURITY.md
- TESTING.md
- AGENTS.md
- PROGRESS.md

Review focus:
1. Does the implementation match the assigned task?
2. Does it respect Electron architecture boundaries?
3. Does the renderer avoid direct Node.js, filesystem, shell, git, and database access?
4. Are IPC APIs narrow and validated?
5. Are errors handled properly?
6. Is Windows compatibility considered?
7. Are terminal processes cleaned up safely?
8. Are destructive actions confirmed?
9. Are logs handled safely?
10. Are secrets redacted where relevant?
11. Are tests added or updated where practical?
12. Do quality commands pass?
13. Are unrelated files changed?
14. Is code simple and maintainable?

Return your review in this format:

Verdict:
Pass / Needs Fix / Blocked

Critical Issues:
- issue
- why it matters
- required fix

Medium Issues:
- issue
- why it matters
- recommended fix

Minor Issues:
- issue
- suggested improvement

Missing Tests:
- test gap
- suggested test

Security Concerns:
- concern
- fix

Architecture Concerns:
- concern
- fix

Files that need attention:
- file path
- reason

Required Fix Plan:
1. step
2. step
3. step

Do not modify files in review mode unless explicitly asked.
```

---

# 12. Fix Prompt

```txt
/goal

You are the Fix Agent for AgentDesk.

Your job is to fix only the issues listed below.

Read:
- README.md
- ARCHITECTURE.md
- TASKS.md
- SECURITY.md
- TESTING.md
- AGENTS.md

Original task:
[PASTE ORIGINAL TASK HERE]

Review findings or failed checks:
[PASTE REVIEW FINDINGS / TEST OUTPUT HERE]

Rules:
1. Fix only the listed issues.
2. Do not refactor unrelated code.
3. Do not rewrite working implementation.
4. Preserve existing behavior unless it is part of the bug.
5. Add tests for the fixed behavior where practical.
6. Keep Electron security boundaries intact.
7. Do not remove confirmations or safety checks.
8. Do not fake passing checks.

Run:
- npm run lint
- npm run typecheck
- npm test
- npm run build

Return:
- What was fixed
- Files changed
- Commands run
- Remaining issues
- Follow-up tasks if needed
```

---

# 13. Quality Check Command Prompt

```txt
/goal

Perform a full quality check for the current AgentDesk implementation.

Read:
- README.md
- ARCHITECTURE.md
- TASKS.md
- SECURITY.md
- TESTING.md
- AGENTS.md

Run or inspect:
- npm run lint
- npm run typecheck
- npm test
- npm run build

Also check:
1. App starts successfully.
2. Electron security settings are correct.
3. Renderer does not directly use Node.js APIs.
4. IPC handlers validate inputs.
5. Terminal sessions can be created and killed.
6. Project folder paths are validated.
7. Git operations are safe.
8. Destructive actions require confirmation.
9. Logs do not expose obvious secrets.
10. Errors are shown clearly in UI.

If checks fail:
- identify the exact cause
- fix the issue
- rerun the relevant check
- report final status

Return:
- Overall status
- Commands run
- Results
- Fixed issues
- Remaining risks
```

---

# 14. Feature Expansion Prompt

```txt
You are a product-minded senior engineer.

Examine the current AgentDesk codebase and docs.

Goal:
Find missing features or weak areas that would make the product more useful without bloating the MVP.

Focus on:
- project workflow
- task management
- terminal UX
- agent profiles
- prompt quality
- run history
- quality gates
- git integration
- Windows developer experience
- safety controls

Return:
1. Missing features
2. Why each matters
3. MVP or later classification
4. Implementation difficulty
5. Suggested task contracts
6. Risks
7. Recommended priority order

Do not implement changes yet.
```

---

# 15. UI/UX Enhancement Prompt

```txt
/goal

Improve the AgentDesk UI/UX without changing core behavior.

Read:
- PRODUCT.md
- ARCHITECTURE.md
- TASKS.md

Goals:
1. Make the app feel like a serious developer tool.
2. Improve task board clarity.
3. Improve terminal layout.
4. Improve empty states.
5. Improve error states.
6. Improve spacing and visual hierarchy.
7. Add clear status indicators for agents and tasks.
8. Keep UI compact and keyboard-friendly.

Rules:
- Do not change backend behavior.
- Do not remove existing features.
- Do not introduce heavy UI dependencies unless needed.
- Preserve accessibility.
- Keep dark mode friendly.

Return:
- Summary
- Screens changed
- Components changed
- Before/after UX improvements
- Risks
```

---

# 16. Security Review Prompt

```txt
You are a security reviewer for AgentDesk.

Review the codebase for risks related to:
- Electron security
- IPC exposure
- filesystem access
- terminal command execution
- git operations
- log storage
- secret leakage
- path traversal
- destructive commands
- dependency risk

Read:
- SECURITY.md
- ARCHITECTURE.md
- AGENTS.md

Return:
Verdict:
Pass / Needs Fix / Blocked

Critical security issues:
- issue
- file
- exploit scenario
- required fix

Medium security issues:
- issue
- file
- recommended fix

Hardening suggestions:
- suggestion
- priority

Do not modify files unless explicitly asked.
```
