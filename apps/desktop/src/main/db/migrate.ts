import type { Database as SqliteDatabase } from "better-sqlite3";
import { INITIAL_MIGRATION_SQL } from "./migrations/0001_initial.js";
import { TASK_CONTRACT_FIELDS_MIGRATION_SQL } from "./migrations/0002_task_contract_fields.js";

const migrations = [
  {
    id: "0001_initial",
    sql: INITIAL_MIGRATION_SQL
  },
  {
    id: "0002_task_contract_fields",
    sql: TASK_CONTRACT_FIELDS_MIGRATION_SQL
  }
];

export const runMigrations = (database: SqliteDatabase): void => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applyMigration = database.transaction((id: string, migrationSql: string) => {
    database.exec(migrationSql);
    database
      .prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)")
      .run(id, new Date().toISOString());
  });

  for (const migration of migrations) {
    const applied = database
      .prepare("SELECT id FROM schema_migrations WHERE id = ?")
      .get(migration.id) as { id: string } | undefined;

    if (applied) {
      continue;
    }

    applyMigration(migration.id, migration.sql);
  }
};
