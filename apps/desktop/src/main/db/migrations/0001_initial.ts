export const INITIAL_MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  repo_url TEXT,
  default_branch TEXT,
  package_manager TEXT,
  tech_stack TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  priority TEXT,
  acceptance_criteria TEXT,
  quality_commands TEXT,
  security_notes TEXT,
  depends_on TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS agent_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  args_template TEXT,
  mode TEXT NOT NULL,
  shell TEXT,
  env_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  task_id TEXT,
  agent_profile_id TEXT,
  terminal_session_id TEXT,
  command TEXT NOT NULL,
  prompt TEXT,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  exit_code INTEGER,
  branch_name TEXT,
  summary TEXT,
  error_message TEXT,
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(task_id) REFERENCES tasks(id),
  FOREIGN KEY(agent_profile_id) REFERENCES agent_profiles(id)
);

CREATE TABLE IF NOT EXISTS terminal_logs (
  id TEXT PRIMARY KEY,
  agent_run_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  chunk TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(agent_run_id) REFERENCES agent_runs(id)
);

CREATE INDEX IF NOT EXISTS terminal_logs_run_sequence_idx
  ON terminal_logs (agent_run_id, sequence);

CREATE TABLE IF NOT EXISTS quality_checks (
  id TEXT PRIMARY KEY,
  agent_run_id TEXT,
  project_id TEXT NOT NULL,
  task_id TEXT,
  label TEXT NOT NULL,
  command TEXT NOT NULL,
  status TEXT NOT NULL,
  output TEXT,
  exit_code INTEGER,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  FOREIGN KEY(agent_run_id) REFERENCES agent_runs(id),
  FOREIGN KEY(project_id) REFERENCES projects(id),
  FOREIGN KEY(task_id) REFERENCES tasks(id)
);

`;
