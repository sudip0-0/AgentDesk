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
