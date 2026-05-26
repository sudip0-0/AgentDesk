import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent, type OpenDialogOptions } from "electron";
import { listProjects, openProjectFromPath } from "../db/repositories/projectRepository.js";

export const registerProjectIpc = (): void => {
  ipcMain.handle("project:list", () => listProjects());

  ipcMain.handle("project:open-folder", async (event: IpcMainInvokeEvent) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = {
      title: "Open Project Folder",
      properties: ["openDirectory", "createDirectory"]
    };
    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || !result.filePaths[0]) {
      return null;
    }

    return openProjectFromPath(result.filePaths[0]);
  });
};
