/**
 * App-level settings.
 *
 * Stored as key/value rows in SQLite and merged with defaults so a missing or
 * partial row always resolves to a complete, typed object. These are global
 * approval/safety preferences, not per-project configuration.
 */

export interface AppSettings {
  /** Block clearly destructive commands before they run (quality + agent launch). */
  blockDestructiveCommands: boolean;
  /** Require an explicit confirmation step before launching an agent. */
  requireAgentLaunchApproval: boolean;
  /** Require confirmation before destructive git actions (commit, branch). */
  confirmDestructiveGit: boolean;
  /** Seconds of no terminal output before a running session is flagged idle. */
  idleWarningSeconds: number;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  blockDestructiveCommands: true,
  requireAgentLaunchApproval: true,
  confirmDestructiveGit: true,
  idleWarningSeconds: 120
};

export const IDLE_WARNING_SECONDS_MIN = 15;
export const IDLE_WARNING_SECONDS_MAX = 3_600;

export type AppSettingsUpdate = Partial<AppSettings>;

/** Persisted renderer UI preferences (separate from safety settings). */
export interface UiPreferences {
  sidebarCollapsed: boolean;
  lastActiveScreen: string;
  /** Per-project last-selected task/run ids, keyed by project id, for fast resume. */
  projectSelections: Record<string, ProjectSelection>;
}

export interface ProjectSelection {
  taskId?: string;
  runId?: string;
}

export const UI_SCREEN_IDS = [
  "dashboard",
  "projects",
  "terminal",
  "tasks",
  "agents",
  "quality",
  "git",
  "documents",
  "runs",
  "settings"
] as const;

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  sidebarCollapsed: false,
  lastActiveScreen: "dashboard",
  projectSelections: {}
};

export type UiPreferencesUpdate = Partial<UiPreferences>;

const sanitizeProjectSelections = (
  value: Record<string, ProjectSelection> | undefined
): Record<string, ProjectSelection> => {
  if (!value || typeof value !== "object") {
    return {};
  }

  const result: Record<string, ProjectSelection> = {};

  for (const [projectId, selection] of Object.entries(value)) {
    if (!selection || typeof selection !== "object") {
      continue;
    }

    const entry: ProjectSelection = {};

    if (typeof selection.taskId === "string") {
      entry.taskId = selection.taskId;
    }

    if (typeof selection.runId === "string") {
      entry.runId = selection.runId;
    }

    result[projectId] = entry;
  }

  return result;
};

export const normalizeUiPreferences = (
  current: UiPreferences,
  patch: UiPreferencesUpdate
): UiPreferences => {
  const next: UiPreferences = { ...current, ...patch };
  const screen = UI_SCREEN_IDS.includes(next.lastActiveScreen as (typeof UI_SCREEN_IDS)[number])
    ? next.lastActiveScreen
    : DEFAULT_UI_PREFERENCES.lastActiveScreen;

  return {
    sidebarCollapsed: Boolean(next.sidebarCollapsed),
    lastActiveScreen: screen,
    projectSelections: sanitizeProjectSelections(next.projectSelections)
  };
};

/** Merges a single project's selection into the preferences (immutably). */
export const setProjectSelection = (
  current: UiPreferences,
  projectId: string,
  selection: ProjectSelection
): UiPreferences => ({
  ...current,
  projectSelections: {
    ...current.projectSelections,
    [projectId]: { ...current.projectSelections[projectId], ...selection }
  }
});

/** Clamps and normalizes a partial settings patch against the allowed ranges. */
export const normalizeAppSettings = (
  current: AppSettings,
  patch: AppSettingsUpdate
): AppSettings => {
  const next: AppSettings = { ...current, ...patch };

  return {
    blockDestructiveCommands: Boolean(next.blockDestructiveCommands),
    requireAgentLaunchApproval: Boolean(next.requireAgentLaunchApproval),
    confirmDestructiveGit: Boolean(next.confirmDestructiveGit),
    idleWarningSeconds: Math.min(
      IDLE_WARNING_SECONDS_MAX,
      Math.max(
        IDLE_WARNING_SECONDS_MIN,
        Number.isFinite(next.idleWarningSeconds) ? Math.round(next.idleWarningSeconds) : DEFAULT_APP_SETTINGS.idleWarningSeconds
      )
    )
  };
};
