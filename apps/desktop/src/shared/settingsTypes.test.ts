import { describe, expect, it } from "vitest";
import {
  DEFAULT_APP_SETTINGS,
  IDLE_WARNING_SECONDS_MAX,
  IDLE_WARNING_SECONDS_MIN,
  normalizeAppSettings
} from "./settingsTypes.js";

describe("normalizeAppSettings", () => {
  it("merges a partial patch over the current settings", () => {
    const next = normalizeAppSettings(DEFAULT_APP_SETTINGS, {
      blockDestructiveCommands: false
    });

    expect(next.blockDestructiveCommands).toBe(false);
    expect(next.requireAgentLaunchApproval).toBe(DEFAULT_APP_SETTINGS.requireAgentLaunchApproval);
  });

  it("clamps idle seconds below the minimum", () => {
    const next = normalizeAppSettings(DEFAULT_APP_SETTINGS, { idleWarningSeconds: 1 });
    expect(next.idleWarningSeconds).toBe(IDLE_WARNING_SECONDS_MIN);
  });

  it("clamps idle seconds above the maximum", () => {
    const next = normalizeAppSettings(DEFAULT_APP_SETTINGS, { idleWarningSeconds: 999_999 });
    expect(next.idleWarningSeconds).toBe(IDLE_WARNING_SECONDS_MAX);
  });

  it("falls back to default idle seconds for non-finite values", () => {
    const next = normalizeAppSettings(DEFAULT_APP_SETTINGS, {
      idleWarningSeconds: Number.NaN
    });
    expect(next.idleWarningSeconds).toBe(DEFAULT_APP_SETTINGS.idleWarningSeconds);
  });

  it("coerces boolean-like values to real booleans", () => {
    const next = normalizeAppSettings(DEFAULT_APP_SETTINGS, {
      confirmDestructiveGit: undefined
    });
    expect(typeof next.confirmDestructiveGit).toBe("boolean");
  });
});
