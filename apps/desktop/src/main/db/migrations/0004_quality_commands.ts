export const QUALITY_COMMANDS_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS quality_commands (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  label TEXT NOT NULL,
  command TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 1,
  timeout_ms INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);
`;
