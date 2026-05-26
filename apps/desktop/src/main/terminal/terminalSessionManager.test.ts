import type { WebContents } from "electron";
import { describe, expect, it } from "vitest";
import { TerminalSessionManager } from "./terminalSessionManager.js";

interface SentEvent {
  channel: string;
  payload: unknown;
}

const waitFor = async (predicate: () => boolean, timeoutMs = 8000): Promise<void> => {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Timed out waiting for terminal event.");
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
  }
};

describe("TerminalSessionManager", () => {
  it("starts a PTY, streams output, accepts input, and exits", async () => {
    const manager = new TerminalSessionManager();
    const events: SentEvent[] = [];
    const webContents = {
      id: 1,
      isDestroyed: () => false,
      send: (channel: string, payload: unknown) => {
        events.push({ channel, payload });
      }
    } as WebContents;

    const session = manager.create({ cwd: process.cwd(), cols: 80, rows: 24 }, webContents);
    const command =
      process.platform === "win32"
        ? "Write-Output AGENTDESK_TERMINAL_READY; exit\r"
        : "echo AGENTDESK_TERMINAL_READY; exit\n";

    manager.write({ id: session.id, data: command }, webContents);

    await waitFor(() =>
      events.some(
        (event) =>
          event.channel === "terminal:data" &&
          JSON.stringify(event.payload).includes("AGENTDESK_TERMINAL_READY")
      )
    );
    await waitFor(() => events.some((event) => event.channel === "terminal:exit"));

    expect(session.cwd).toBe(process.cwd());
    expect(events.some((event) => event.channel === "terminal:data")).toBe(true);
    expect(events.some((event) => event.channel === "terminal:exit")).toBe(true);
  }, 10000);
});
