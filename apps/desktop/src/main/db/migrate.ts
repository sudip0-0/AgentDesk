import type { Database as SqliteDatabase } from "better-sqlite3";
import { INITIAL_MIGRATION_SQL } from "./migrations/0001_initial.js";

const MIGRATION_ID = "0001_initial";

export const runMigrations = (database: SqliteDatabase): void => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = database
    .prepare("SELECT id FROM schema_migrations WHERE id = ?")
    .get(MIGRATION_ID) as { id: string } | undefined;

  if (applied) {
    return;
  }

  const applyMigration = database.transaction(() => {
    database.exec(INITIAL_MIGRATION_SQL);
    database
      .prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)")
      .run(MIGRATION_ID, new Date().toISOString());
  });

  applyMigration();
};
