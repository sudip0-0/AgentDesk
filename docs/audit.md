# AgentDesk Codebase Audit

Date: 2026-05-29
Reviewer role: senior architect / security / quality

## 1. How the app is built

AgentDesk is a single-package Electron + React + TypeScript desktop app (not a
real monorepo despite the `apps/desktop` path). Layout:

- `apps/desktop/src/main` — Electron main process (db, projects, tasks, agents,
  terminal, quality, git, documents, runs, ipc).
- `apps/desktop/src/preload` — single `contextBridge` API surface.
- `apps/desktop/src/renderer` — React UI (screens as panels).
- `apps/desktop/src/shared` — pure logic and types shared by main + renderer.

Storage is local SQLite via Drizzle. Terminals use node-pty. Git uses the system
`git` CLI. Quality checks shell out to the project's package scripts.

## 2. Quality gate baseline (verified, not assumed)

Run on Windows, Node v22.19.0, npm 10.5.1, git 2.51.0:

| Command | Result |
| --- | --- |
| `npm run typecheck` | pass (exit 0) |
| `npm run lint` | pass, 0 warnings |
| `npm test` | 92 passed / 28 files |
| `npm run build` | pass (main + preload + renderer bundles) |

The `AttachConsole failed` lines printed during `npm test` are node-pty conpty
noise on Windows, not test failures.

## 3. What is already implemented and working

All ten documented phases are functionally present: project picker + metadata
detection, task board + contract fields, prompt engine, node-pty terminals with
log persistence, agent profiles + launch flow, quality command config + runner,
git status/diff/branch/commit, document generation, run detail, command palette.

## 4. Security review

Strong points (verified in code):

- `webPreferences`: `sandbox: true`, `contextIsolation: true`,
  `nodeIntegration: false`; `setWindowOpenHandler` denies in-app navigation.
- Preload exposes a narrow, typed API; every IPC handler validates input with Zod.
- Git executes with `spawn("git", argv, { shell: false })` — no shell injection.
  Paths are constrained with `toRepoRelativePath` and `isPathInsideRoot`.
- Terminal cwd is constrained to the project root; secret redaction runs on
  terminal, quality, and git output.
- No auto-push; commits and destructive git actions require UI confirmation.

Gap (now addressed):

- **Safety Layer was missing.** `qualityRunner.ts` ran user-configured commands
  through `spawn(command, { shell: true })` with no destructive-command
  detection. SECURITY.md and the product vision both call for blocking/approving
  destructive commands, but nothing enforced it.

## 5. Over-engineering / scope notes

- The `apps/desktop` nesting implies a monorepo that does not exist. Harmless;
  not worth churn to flatten in MVP.
- Renderer ships as one ~1.16 MB JS chunk. Acceptable for a desktop app; code
  splitting is a future optimization, not a bug.

## 6. Change made in this pass

Added a command-safety layer (vision module #8 / Phase 8):

- `shared/commandSafety.ts` — pure classifier for destructive command patterns
  (recursive force deletes, `git reset --hard`, `git clean -f`, force push, disk
  format / `dd` / `mkfs`, credential/secret access, fork bomb), with unit tests.
- `qualityRunner.ts` — blocks dangerous quality commands by default, recording a
  `blocked` check with an explanation instead of executing them.
- `QualityPanel.tsx` — warns on dangerous commands in the editor, the command
  list, and the run-confirmation dialog; renders the new `blocked` status.

Added agent availability detection + test command (Agents requirements):

- `shared/agentAvailability.ts` — pure PATH/PATHEXT candidate builder, unit tested.
- `main/agents/agentAvailabilityRunner.ts` — resolves installed/missing per
  profile via the filesystem and runs a `--version` probe (no shell) to test a
  command, with redacted output.
- New IPC `agent-profile:availability` and `agent-profile:test`, exposed through
  the preload bridge.
- `AgentProfilesPanel.tsx` — Installed/Missing badge per profile, "Refresh
  Status", and a "Test Command" button with result output.

Default seeded quality commands (`npm run lint/typecheck/test/build`) are not
flagged, so existing behavior is unchanged.

## 7. Reliability pass

- `reconcileInterruptedRuns` on startup marks crashed/force-quit `running` runs
  as `failed` and resets their linked tasks to `ready`.
- Spawn failures persist a run `errorMessage`, shown on the run detail screen.
- The quality runner validates the workspace still exists before spawning.

## 8. Review engine + persistence

- `shared/reviewSummary.ts` — pure pass/fail/warning verdict with risks and
  recommendations, unit tested.
- `reviews` table (migration 0005) + `reviewRepository` persist a review linked
  to run and task; run detail can "Save Review" and shows saved history.

## 9. Settings + agent-launch safety + watchdog

- `app_settings` table + `settingsRepository` + `settings:get`/`settings:update`
  IPC, with an editable Settings screen (block destructive commands, require
  launch approval, confirm destructive git, idle warning threshold).
- Agent launches are classified by the safety layer and blocked (gated by the
  `blockDestructiveCommands` setting) before the PTY spawns.
- Process watchdog: running sessions idle past the configured threshold are
  flagged `idle` in the terminal UI (`shared/terminalIdle.ts`).

All four previously recommended next tasks are now implemented.

## 10. Recommended next tasks

1. Auto-refresh agent availability on a timer or on window focus.
2. Wire `requireAgentLaunchApproval` / `confirmDestructiveGit` settings into the
   relevant confirmation dialogs (currently the launch flow always confirms).
3. Consider OS-keychain storage if agent profile env ever needs real secrets.
4. Add a per-project "allow this command" override for blocked commands (audited).
