# AgentDesk UI/UX Audit

Date: 2026-05-29

## Current screens / navigation

Single-window app shell: left sidebar (`Tabs`) + top bar + main content. Screens
are conditionally rendered panels keyed off `activeNav`:

Projects, Terminal, Tasks, Agents, Quality, Git, Docs, Runs, Settings.

Navigation works and shows the active item. There is no router; screens are
mounted/unmounted by `activeNav` state. Command palette (Ctrl+Shift+P) and
keyboard shortcuts exist.

## Issues found

### 1. Inconsistent status design (highest impact)
Status badge color/label logic is duplicated in at least five places
(`QualityPanel`, `RunDetailPanel`, `TerminalPanel`, `AgentProfilesPanel`,
`ProjectOverviewPanel`), each with its own `statusVariant` function and ad-hoc
labels. The same concept ("failed", "running", "passed") renders differently
across screens. No single source of truth for status → color/label.

### 2. No shared state components
Empty, loading, and error states are hand-rolled with `Card` + `CardTitle` in
every panel. There is no `EmptyState`, `ErrorState`, or `LoadingState`, so
wording and layout drift between screens.

### 3. Top bar does not answer "where am I"
The top bar shows a hardcoded "Phase 10" label and the build phase name, plus
SQLite/PTY badges. It does not show the active git branch or a running-agent
indicator, which the orchestrator use case needs front and center.

### 4. Persistent dev-status clutter
A three-card row ("PTY sessions", "SQLite storage", "xterm.js + Tailwind UI")
renders at the bottom of *every* screen. It is build-status noise that reduces
the command-center feel and pushes real content down.

### 5. Accessibility gaps
Buttons/tabs use `transition` but no visible `focus-visible` ring, so keyboard
focus is hard to see. Otherwise labels and heading structure are reasonable.

### 6. Empty-state calls to action
Several empty states describe the problem but lack the primary action button the
brief asks for (e.g. "No project open" has no inline Open button in the overview
panel).

## Fixes implemented in this pass

1. Added `StatusBadge` — a single component mapping every domain status
   (ready/running/waiting/idle/failed/passed/warning/completed/cancelled/blocked/
   skipped/missing/needs review/...) to a consistent variant + label. Adopted it
   in the run list, run detail, quality results, and agent availability.
2. Added `EmptyState` and `PageHeader` reusable components and used them in the
   key panels.
3. Reworked the top bar to show the active workspace, git branch, and a
   running-agent indicator; removed the hardcoded phase label.
4. Removed the persistent dev-status card row from non-Projects screens.
5. Added visible `focus-visible` rings to `Button` and sidebar tabs.

## Remaining UI gaps (recommended next)

- Persisting the per-project last-selected *task* (run selection is persisted;
  task selection would require lifting the task board's internal selection).
- Markdown image syntax and reference links are not handled.

## Fifth UI pass — full audit remediation (2026-05-31)

A fresh four-phase audit was run; this pass implemented every actionable finding
across P0 (correctness/trust), P1 (consistency/reliability), and P2 (strategic).

P0 — correctness & trust:
- Inert safety settings now take effect. `requireAgentLaunchApproval` gates the
  agent-launch confirmation (TaskBoard) and `confirmDestructiveGit` gates the
  commit/branch confirmations (GitPanel), via the new `hooks/useAppSettings.ts`.
- `Dialog` is keyboard-accessible: Escape closes, Tab focus is trapped, focus
  moves into the dialog on open and is restored to the trigger on close. This
  fixes the command palette and every confirmation dialog at once.
- The command palette is now a real palette: an autofocused filter input
  (Enter runs the top match) plus a `Ctrl/Cmd+K` binding, so the "Search ⌘K"
  top-bar button is accurate.

P1 — consistency & reliability:
- Agent prompt delivery to stdin uses output-based readiness detection
  (debounced after the agent's output settles, with a fallback for silent CLIs)
  instead of a fixed 500ms timer.
- `TerminalPanel` renders the shared `StatusBadge` instead of its own status
  color/label logic — the last screen still duplicating it.
- Window `minWidth` lowered 1024 → 720 so the responsive layout is reachable.
- Unified toast system (`lib/toast.ts` + `components/ui/Toast.tsx`); project
  open/load feedback and previously-swallowed errors route through it, and the
  ad-hoc inline message/error divs in the workspace panel were removed.
- Roving `tabindex` + Arrow/Home/End keyboard navigation on the sidebar `Tabs`
  and the terminal tablist.

P2 — strategic:
- First-run onboarding on the Dashboard: a welcome card with the 6-step core
  loop and an Open Workspace CTA replaces the empty metric cards.
- New **Agent Comparison** screen (`AgentComparisonPanel`, "Compare" nav item):
  groups a selected task's runs by agent profile side by side (status, duration,
  exit code). Reuses the existing `runs:list` IPC — no backend changes.
- Theme tokens `--color-elevated/inset/code` added and the dominant repeated
  background hex literals migrated to them (a couple of one-off accent text
  colors remain inline). Removed dead `app.getPhase()`. DB health and agent
  availability re-probe on window focus.

Verified: typecheck, lint (0 warnings), 152 tests (35 files), and build all pass.

## Fourth UI pass (gaps closed)

- Markdown: extracted parsing into `shared/markdownParser.ts` (pure + tested) and
  added GitHub-style tables and nested lists to the renderer.
- Diff: added `shared/diffHighlight.ts` (LCS word-level diff, tested) and the
  diff viewer now highlights changed tokens within paired removed/added lines.
- Running-agent indicator: now sourced from the main process. The terminal
  session manager broadcasts `terminal:sessions` and exposes a count query, so
  the top-bar pill reflects every active PTY, not just the renderer's view.
- Resume: the per-project last-selected run id is persisted in `app_settings` UI
  preferences and restored when switching projects.

## Third UI pass (gaps closed)

- Markdown preview: added a dependency-free `Markdown` renderer (no
  `dangerouslySetInnerHTML`) with a Rendered/Raw toggle in the Docs preview.
- Persistence: sidebar-collapsed state and the last active screen are stored in
  `app_settings` (UI preferences key) via `settings:get-ui`/`settings:update-ui`
  and restored on launch.
- Always-mounted terminal: the terminal panel is kept mounted and hidden when
  inactive, so navigating between screens no longer kills running agents. It
  refits when shown again.
- Running-agent indicator: the top bar shows a live "N running" pill driven by
  the terminal panel's active session count.
- Responsive: relaxed body min-width to 560px; two-column panels already stack
  below the `xl` breakpoint.

## Second UI pass (gaps closed)

- Added a dedicated **Dashboard** screen (`DashboardPanel`) with metric cards
  (branch, active/needs-review/failed tasks), recent runs, next task, and quick
  actions; it is now the default screen and the Projects tab was renamed
  "Workspace".
- Added reusable `Skeleton`/`SkeletonCard`, `MetricCard`, and `DiffView`
  (per-line colored git diff) primitives.
- Adopted `PageHeader` across Runs, Git, and Docs; converted remaining
  hand-rolled empty states in Git and Docs to `EmptyState`.
- Git panel now renders colored diffs and shows a skeleton while status loads;
  the dashboard shows skeletons while the overview loads.
- Added a collapsible sidebar (header toggle) and relaxed the body min-width from
  1024px to 720px for narrower windows.
