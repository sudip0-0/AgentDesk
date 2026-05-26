import { closeDatabase, getSqliteDatabase } from "./client.js";
import { checkDatabaseHealth } from "./health.js";
import { getDatabasePath } from "./paths.js";
import { ensureDefaultProject } from "./seed.js";
import { TerminalLogWriter } from "./terminalLogWriter.js";

export const terminalLogWriter = new TerminalLogWriter();

export const initializeDatabase = (): void => {
  getSqliteDatabase();
  ensureDefaultProject();
};

export const shutdownDatabase = (): void => {
  terminalLogWriter.flushAll();
  closeDatabase();
};

export const getDatabaseHealthSnapshot = () => {
  return checkDatabaseHealth(getDatabasePath());
};
