import { ipcMain, type IpcMainInvokeEvent, type WebContents } from "electron";
import { TerminalSessionManager } from "./terminalSessionManager.js";
import {
  createTerminalRequestSchema,
  parseIpcPayload,
  terminalKillRequestSchema,
  terminalResizeRequestSchema,
  terminalWriteRequestSchema
} from "./terminalValidation.js";

export const terminalSessionManager = new TerminalSessionManager();

const sendTerminalError = (
  webContents: WebContents,
  id: string | undefined,
  message: string
): void => {
  if (!webContents.isDestroyed() && id) {
    webContents.send("terminal:error", { id, message });
  }
};

export const registerTerminalIpc = (): void => {
  ipcMain.handle("terminal:create", (event: IpcMainInvokeEvent, payload: unknown) => {
    const parsed = parseIpcPayload(createTerminalRequestSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    try {
      return terminalSessionManager.create(parsed.data, event.sender);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create terminal.";
      throw new Error(message);
    }
  });

  ipcMain.on("terminal:write", (event, payload: unknown) => {
    const parsed = parseIpcPayload(terminalWriteRequestSchema, payload);

    if (!parsed.success) {
      sendTerminalError(event.sender, undefined, parsed.message);
      return;
    }

    try {
      terminalSessionManager.write(parsed.data, event.sender);
    } catch (error) {
      sendTerminalError(
        event.sender,
        parsed.data.id,
        error instanceof Error ? error.message : "Failed to write to terminal."
      );
    }
  });

  ipcMain.on("terminal:resize", (event, payload: unknown) => {
    const parsed = parseIpcPayload(terminalResizeRequestSchema, payload);

    if (!parsed.success) {
      sendTerminalError(event.sender, undefined, parsed.message);
      return;
    }

    try {
      terminalSessionManager.resize(parsed.data, event.sender);
    } catch (error) {
      sendTerminalError(
        event.sender,
        parsed.data.id,
        error instanceof Error ? error.message : "Failed to resize terminal."
      );
    }
  });

  ipcMain.handle("terminal:kill", (event: IpcMainInvokeEvent, payload: unknown) => {
    const parsed = parseIpcPayload(terminalKillRequestSchema, payload);

    if (!parsed.success) {
      throw new Error(parsed.message);
    }

    terminalSessionManager.kill(parsed.data.id, event.sender);
  });
};
