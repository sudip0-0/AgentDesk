import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { getDatabasePath } from "./paths.js";
import { runMigrations } from "./migrate.js";
import * as schema from "./schema.js";

let sqliteDatabase: Database.Database | null = null;
let databaseClient: BetterSQLite3Database<typeof schema> | null = null;

export class DatabaseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

export const getSqliteDatabase = (): Database.Database => {
  if (!sqliteDatabase) {
    try {
      sqliteDatabase = new Database(getDatabasePath());
      sqliteDatabase.pragma("journal_mode = WAL");
      sqliteDatabase.pragma("foreign_keys = ON");
      runMigrations(sqliteDatabase);
    } catch (error) {
      throw new DatabaseError(
        error instanceof Error ? error.message : "Failed to open the local database."
      );
    }
  }

  return sqliteDatabase;
};

export const getDatabase = (): BetterSQLite3Database<typeof schema> => {
  if (!databaseClient) {
    databaseClient = drizzle(getSqliteDatabase(), { schema });
  }

  return databaseClient;
};

export const closeDatabase = (): void => {
  databaseClient = null;

  if (sqliteDatabase) {
    sqliteDatabase.close();
    sqliteDatabase = null;
  }
};
