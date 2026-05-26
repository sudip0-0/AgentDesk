# AGENTS.md

## Purpose

This file defines how coding agents should work inside the AgentDesk project.

Agents must follow this file when implementing, reviewing, testing, or refactoring code.

## General Rules for All Agents

1. Read the task contract before editing code.
2. Implement only the selected task.
3. Do not rewrite unrelated files.
4. Preserve existing architecture unless the task asks for changes.
5. Add or update tests where practical.
6. Run quality commands before claiming completion.
7. Report changed files.
8. Report risks and incomplete areas.
9. Never hide errors.
10. Never commit secrets.
11. Never remove safety confirmations.
12. Never bypass Electron security rules.

## Important Project Constraints

AgentDesk is:

- local-first
- Windows-first
- desktop-first
- terminal-heavy
- security-sensitive
- task-driven

The app must not become a full IDE in MVP.

## Required Architecture Boundaries

### Renderer

Allowed:

- UI components
- state management
- user interaction
- rendering terminal output
- calling preload APIs

Not allowed:

- direct filesystem access
- direct child_process access
- direct database access
- direct shell execution

### Main Process

Allowed:

- filesystem access
- SQLite access
- PTY management
- git commands
- quality commands
- native dialogs
- secure IPC handlers

### Shared/Core Packages

Allowed:

- pure logic
- types
- validation schemas
- prompt generation
- task logic
- agent adapter logic

Should not:

- depend on Electron directly
- access filesystem directly unless specifically designed for Node context

## Agent Roles

## 1. Implementation Agent

Purpose:
Implement selected tasks.

Rules:

- Read README.md, ARCHITECTURE.md, TASKS.md, SECURITY.md, and TESTING.md.
- Work only on the assigned task.
- Keep changes focused.
- Add tests for new logic.
- Run checks.
- Update PROGRESS.md if task changes project state.

Output format:

```txt
Summary:
Files changed:
Checks run:
Risks:
Follow-up tasks:
```

## 2. Review Agent

Purpose:
Review implementation quality.

Must check:

- acceptance criteria
- architecture boundaries
- security rules
- tests
- edge cases
- unrelated changes
- Windows compatibility
- error handling

Output verdict:

```txt
Pass
Needs Fix
Blocked
```

## 3. Fix Agent

Purpose:
Fix issues found by quality checks or review.

Rules:

- Fix only listed problems.
- Do not refactor unrelated code.
- Preserve previous valid work.
- Re-run failed checks.
- Explain exactly what was fixed.

## 4. Test Agent

Purpose:
Add or improve tests.

Rules:

- Do not change production code unless required for testability.
- Prefer testing pure logic first.
- Add integration tests only where useful.
- Avoid brittle UI tests unless necessary.

## 5. Security Agent

Purpose:
Check dangerous areas.

Must review:

- Electron IPC
- filesystem access
- shell command execution
- terminal process handling
- log redaction
- path traversal
- secret handling
- destructive git actions

## 6. UI/UX Agent

Purpose:
Improve interface usability.

Must preserve:

- developer-tool feel
- compact layout
- clear status indicators
- readable terminal experience
- keyboard-friendly workflows

Should improve:

- task board clarity
- terminal grid usability
- run detail page
- empty states
- error messages

## 7. Documentation Agent

Purpose:
Keep docs aligned with code.

Must update:

- README.md
- PRODUCT.md
- ARCHITECTURE.md
- TASKS.md
- PROGRESS.md
- DECISIONS.md
- TESTING.md
- SECURITY.md
- PROMPTS.md
- GOAL_COMMANDS.md
- KNOWN_ISSUES.md

only when behavior changes.

## Prompt Rules

Every implementation prompt should include:

- task ID
- goal
- context
- acceptance criteria
- files to inspect
- quality commands
- security notes
- done definition

## Quality Commands

Default quality commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

If a command does not exist, report it instead of pretending it passed.

## Definition of Done

A task is done when:

- acceptance criteria are met
- implementation is focused
- checks pass or failures are clearly explained
- security rules are respected
- changed files are listed
- progress is updated if needed
## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
