import { describe, expect, it, vi } from "vitest";
import {
  PROMPT_SEND_CONFIRM_THRESHOLD,
  shouldConfirmPromptSend,
  splitPromptLines,
  writePromptToTerminal
} from "./promptDelivery.js";

describe("promptDelivery", () => {
  it("requires confirmation for long prompts", () => {
    expect(shouldConfirmPromptSend("x".repeat(PROMPT_SEND_CONFIRM_THRESHOLD - 1))).toBe(false);
    expect(shouldConfirmPromptSend("x".repeat(PROMPT_SEND_CONFIRM_THRESHOLD))).toBe(true);
  });

  it("writes prompts line by line with Windows-friendly line endings", async () => {
    vi.useFakeTimers();
    const writes: string[] = [];

    const promise = writePromptToTerminal("line-one\nline-two", (data) => {
      writes.push(data);
    }, 10);

    await vi.runAllTimersAsync();
    await promise;

    expect(writes).toEqual(["line-one\r\n", "line-two\r"]);
    vi.useRealTimers();
  });

  it("writes multi-line prompts line by line with terminal line endings", async () => {
    const writes: string[] = [];

    await writePromptToTerminal("line one\nline two", (data) => {
      writes.push(data);
    }, 0);

    expect(writes).toEqual(["line one\r\n", "line two\r"]);
  });

  it("splits prompts on Windows and Unix newlines", () => {
    expect(splitPromptLines("a\r\nb\nc")).toEqual(["a", "b", "c"]);
  });
});
