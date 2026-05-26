import { app } from "electron";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

let databasePathOverride: string | null = null;

export const setDatabasePathForTests = (path: string | null): void => {
  databasePathOverride = path;
};

export const getDatabasePath = (): string => {
  if (databasePathOverride) {
    return databasePathOverride;
  }

  const userDataPath = app.getPath("userData");
  const databaseDirectory = join(userDataPath, "data");
  mkdirSync(databaseDirectory, { recursive: true });
  return join(databaseDirectory, "agentdesk.db");
};
