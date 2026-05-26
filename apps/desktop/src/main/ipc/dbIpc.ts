import { ipcMain } from "electron";
import { getDatabaseHealthSnapshot } from "../db/initDatabase.js";

export const registerDatabaseIpc = (): void => {
  ipcMain.handle("db:health", () => getDatabaseHealthSnapshot());
};
