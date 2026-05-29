import { describe, expect, it } from "vitest";
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_UI_PREFERENCES,
  IDLE_WARNING_SECONDS_MAX,
  IDLE_WARNING_SECONDS_MIN,
  normalizeAppSettings,
  normalizeUiPreferences,
  setProjectSelection
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

describe("normalizeUiPreferences", () => {
  it("keeps a known screen id", () => {
    const next = normalizeUiPreferences(DEFAULT_UI_PREFERENCES, { lastActiveScreen: "git" });
    expect(next.lastActiveScreen).toBe("git");
  });

  it("falls back to the default screen for an unknown id", () => {
    const next = normalizeUiPreferences(DEFAULT_UI_PREFERENCES, {
      lastActiveScreen: "not-a-real-screen"
    });
    expect(next.lastActiveScreen).toBe(DEFAULT_UI_PREFERENCES.lastActiveScreen);
  });

  it("coerces the sidebar flag to a boolean", () => {
    const next = normalizeUiPreferences(DEFAULT_UI_PREFERENCES, { sidebarCollapsed: true });
    expect(next.sidebarCollapsed).toBe(true);
  });

  it("sanitizes project selections, dropping non-string ids", () => {
    const next = normalizeUiPreferences(DEFAULT_UI_PREFERENCES, {
      projectSelections: {
        p1: { taskId: "t1", runId: "r1" },
        // @ts-expect-error testing runtime sanitization of bad input
        p2: { taskId: 5, runId: "r2" }
      }
    });

    expect(next.projectSelections.p1).toEqual({ taskId: "t1", runId: "r1" });
    expect(next.projectSelections.p2).toEqual({ runId: "r2" });
  });
});

describe("setProjectSelection", () => {
  it("merges a project selection without dropping other projects", () => {
    const base = setProjectSelection(DEFAULT_UI_PREFERENCES, "p1", { runId: "r1" });
    const next = setProjectSelection(base, "p2", { taskId: "t2" });

    expect(next.projectSelections.p1).toEqual({ runId: "r1" });
    expect(next.projectSelections.p2).toEqual({ taskId: "t2" });
  });

  it("merges fields within the same project", () => {
    const base = setProjectSelection(DEFAULT_UI_PREFERENCES, "p1", { runId: "r1" });
    const next = setProjectSelection(base, "p1", { taskId: "t1" });

    expect(next.projectSelections.p1).toEqual({ runId: "r1", taskId: "t1" });
  });
});
