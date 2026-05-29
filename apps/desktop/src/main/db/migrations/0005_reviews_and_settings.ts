export const REVIEWS_AND_SETTINGS_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  task_id TEXT,
  status TEXT NOT NULL,
  risks TEXT NOT NULL DEFAULT '[]',
  recommendations TEXT NOT NULL DEFAULT '[]',
  changed_file_count INTEGER NOT NULL DEFAULT 0,
  quality_passed INTEGER NOT NULL DEFAULT 0,
  quality_failed INTEGER NOT NULL DEFAULT 0,
  quality_skipped INTEGER NOT NULL DEFAULT 0,
  quality_blocked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(run_id) REFERENCES agent_runs(id),
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_run ON reviews(run_id, created_at);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;
