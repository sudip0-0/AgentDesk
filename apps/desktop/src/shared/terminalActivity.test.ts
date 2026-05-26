import { describe, expect, it } from "vitest";
import {
  appendOutputTail,
  detectWaitingForInput,
  stripAnsi
} from "./terminalActivity.js";

describe("terminalActivity", () => {
  it("detects common confirmation prompts", () => {
    expect(detectWaitingForInput("Apply changes? (y/n) ")).toBe(true);
    expect(detectWaitingForInput("Press Enter to continue")).toBe(true);
    expect(detectWaitingForInput("Waiting for your response...")).toBe(true);
  });

  it("detects colon and question prompts on the last line", () => {
    expect(detectWaitingForInput("Choose an option:\n1. Build\n2. Test\n> ")).toBe(false);
    expect(detectWaitingForInput("Enter branch name: ")).toBe(true);
    expect(detectWaitingForInput("Continue? ")).toBe(true);
  });

  it("ignores shell prompts and ansi codes", () => {
    const output = `\x1b[32mPS C:\\Projects\\AgentDesk>\x1b[0m `;
    expect(detectWaitingForInput(output)).toBe(false);
    expect(stripAnsi(output)).toBe("PS C:\\Projects\\AgentDesk> ");
  });

  it("keeps a bounded output tail", () => {
    const tail = appendOutputTail("abc", "def", 5);
    expect(tail).toBe("bcdef");
  });
});
