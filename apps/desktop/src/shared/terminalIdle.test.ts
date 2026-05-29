import { describe, expect, it } from "vitest";
import { isSessionIdle } from "./terminalIdle.js";

describe("isSessionIdle", () => {
  it("is idle once the threshold has elapsed since last output", () => {
    expect(
      isSessionIdle({ lastOutputAt: 0, now: 120_000, idleThresholdMs: 120_000 })
    ).toBe(true);
  });

  it("is not idle before the threshold elapses", () => {
    expect(
      isSessionIdle({ lastOutputAt: 0, now: 119_000, idleThresholdMs: 120_000 })
    ).toBe(false);
  });

  it("never reports idle when the threshold is zero or negative", () => {
    expect(isSessionIdle({ lastOutputAt: 0, now: 10_000_000, idleThresholdMs: 0 })).toBe(false);
    expect(isSessionIdle({ lastOutputAt: 0, now: 10_000_000, idleThresholdMs: -5 })).toBe(false);
  });
});
