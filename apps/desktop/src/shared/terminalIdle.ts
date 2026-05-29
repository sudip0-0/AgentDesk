/**
 * Pure helper for the idle/hang watchdog.
 *
 * A running session that produces no output for a configurable period is flagged
 * "idle" so the user can decide to wait or kill it. This is best-effort: some
 * agents legitimately go quiet while thinking.
 */

export const DEFAULT_IDLE_THRESHOLD_MS = 120_000;

/** True when a busy session has produced no output for longer than the threshold. */
export const isSessionIdle = (input: {
  lastOutputAt: number;
  now: number;
  idleThresholdMs: number;
}): boolean => {
  if (input.idleThresholdMs <= 0) {
    return false;
  }

  return input.now - input.lastOutputAt >= input.idleThresholdMs;
};
