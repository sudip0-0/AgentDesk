import { ipcMain, type IpcMainInvokeEvent } from "electron";
import { TerminalSessionManager } from "./terminalSessionManager.js";
import type {
  CreateTerminalRequest,
  TerminalKillRequest,
  TerminalResizeRequest,
  TerminalWriteRequest
} from "../../shared/terminalTypes.js";

export const terminalSessionManager = new TerminalSessionManager();

export const registerTerminalIpc = (): void => {
  ipcMain.handle(
    "terminal:create",
    (event: IpcMainInvokeEvent, request: CreateTerminalRequest) =>
      terminalSessionManager.create(request, event.sender)
  );

  ipcMain.on("terminal:write", (event, request: TerminalWriteRequest) => {
    try {
      terminalSessionManager.write(request, event.sender);
    } catch (error) {
      event.sender.send("terminal:error", {
        id: request.id,
        message: error instanceof Error ? error.message : "Failed to write to terminal."
      });
    }
  });

  ipcMain.on("terminal:resize", (event, request: TerminalResizeRequest) => {
    try {
      terminalSessionManager.resize(request, event.sender);
    } catch (error) {
      event.sender.send("terminal:error", {
        id: request.id,
        message: error instanceof Error ? error.message : "Failed to resize terminal."
      });
    }
  });

  ipcMain.handle("terminal:kill", (event: IpcMainInvokeEvent, request: TerminalKillRequest) => {
    terminalSessionManager.kill(request.id, event.sender);
  });
};
