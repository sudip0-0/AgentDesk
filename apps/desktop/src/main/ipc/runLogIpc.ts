import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from "electron";
import { writeFileSync } from "node:fs";
import { z } from "zod";
import { getAgentRun } from "../db/repositories/agentRunRepository.js";
import {
  buildTranscript,
  getTerminalLogMeta,
  listTerminalLogChunks
} from "../db/repositories/terminalLogRepository.js";

const runIdSchema = z.object({
  runId: z.string().uuid()
});

const listChunksSchema = z.object({
  runId: z.string().uuid(),
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(200).default(40)
});

const parsePayload = <T>(
  schema: z.ZodType<T>,
  payload: unknown
): { success: true; data: T } | { success: false; message: string } => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    return {
      success: false,
      message: result.error.issues[0]?.message ?? "Invalid request."
    };
  }

  return { success: true, data: result.data };
};

const assertRunExists = (runId: string): void => {
  const run = getAgentRun(runId);

  if (!run) {
    throw new Error("Agent run was not found.");
  }
};

export const registerRunLogIpc = (): void => {
  ipcMain.handle("runs:log-meta", (_event, payload: unknown) => {
    const parsed = parsePayload(runIdSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    assertRunExists(parsed.data.runId);
    return getTerminalLogMeta(parsed.data.runId);
  });

  ipcMain.handle("runs:log-chunks", (_event, payload: unknown) => {
    const parsed = parsePayload(listChunksSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    assertRunExists(parsed.data.runId);
    return listTerminalLogChunks(parsed.data.runId, parsed.data.offset, parsed.data.limit);
  });

  ipcMain.handle(
    "runs:export-log",
    async (event: IpcMainInvokeEvent, payload: unknown) => {
      const parsed = parsePayload(runIdSchema, payload);

      if (!parsed.success) {
        throw new Error(parsed.message);
      }

      assertRunExists(parsed.data.runId);

      const window = BrowserWindow.fromWebContents(event.sender);

      if (!window) {
        throw new Error("Could not open the export dialog.");
      }

      const result = await dialog.showSaveDialog(window, {
        title: "Export terminal transcript",
        defaultPath: `agentdesk-transcript-${parsed.data.runId.slice(0, 8)}.log`,
        filters: [{ name: "Log Files", extensions: ["log", "txt"] }]
      });

      if (result.canceled || !result.filePath) {
        return { exported: false };
      }

      const transcript = buildTranscript(parsed.data.runId);
      writeFileSync(result.filePath, transcript, "utf8");

      return { exported: true, filePath: result.filePath };
    }
  );
};
