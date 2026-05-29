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

- A polished narrow/tablet table→card reflow (the sidebar now collapses and the
  min-width was relaxed, but some two-column panels still assume width).
- Real markdown rendering in the Docs preview (currently raw text).
- Inline syntax highlighting inside diff lines (line-level coloring is done).

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
