import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull().unique(),
  repoUrl: text("repo_url"),
  defaultBranch: text("default_branch"),
  packageManager: text("package_manager"),
  techStack: text("tech_stack"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull(),
  priority: text("priority"),
  goal: text("goal"),
  context: text("context"),
  acceptanceCriteria: text("acceptance_criteria"),
  filesLikelyAffected: text("files_likely_affected"),
  qualityCommands: text("quality_commands"),
  securityNotes: text("security_notes"),
  doneDefinition: text("done_definition"),
  dependsOn: text("depends_on"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const agentProfiles = sqliteTable("agent_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  command: text("command").notNull(),
  argsTemplate: text("args_template"),
  mode: text("mode").notNull(),
  shell: text("shell"),
  envJson: text("env_json"),
  workingDirectoryBehavior: text("working_directory_behavior").notNull().default("project_root"),
  promptDelivery: text("prompt_delivery").notNull().default("send_to_stdin"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const agentRuns = sqliteTable("agent_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  taskId: text("task_id").references(() => tasks.id),
  agentProfileId: text("agent_profile_id").references(() => agentProfiles.id),
  terminalSessionId: text("terminal_session_id"),
  command: text("command").notNull(),
  prompt: text("prompt"),
  status: text("status").notNull(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  exitCode: integer("exit_code"),
  branchName: text("branch_name"),
  summary: text("summary"),
  errorMessage: text("error_message")
});

export const terminalLogs = sqliteTable("terminal_logs", {
  id: text("id").primaryKey(),
  agentRunId: text("agent_run_id")
    .notNull()
    .references(() => agentRuns.id),
  sequence: integer("sequence").notNull(),
  chunk: text("chunk").notNull(),
  createdAt: text("created_at").notNull()
});

export const qualityChecks = sqliteTable("quality_checks", {
  id: text("id").primaryKey(),
  agentRunId: text("agent_run_id").references(() => agentRuns.id),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  taskId: text("task_id").references(() => tasks.id),
  label: text("label").notNull(),
  command: text("command").notNull(),
  status: text("status").notNull(),
  output: text("output"),
  exitCode: integer("exit_code"),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at")
});

export const qualityCommands = sqliteTable("quality_commands", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  label: text("label").notNull(),
  command: text("command").notNull(),
  required: integer("required").notNull().default(1),
  timeoutMs: integer("timeout_ms"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  runId: text("run_id")
    .notNull()
    .references(() => agentRuns.id),
  taskId: text("task_id").references(() => tasks.id),
  status: text("status").notNull(),
  risks: text("risks").notNull().default("[]"),
  recommendations: text("recommendations").notNull().default("[]"),
  changedFileCount: integer("changed_file_count").notNull().default(0),
  qualityPassed: integer("quality_passed").notNull().default(0),
  qualityFailed: integer("quality_failed").notNull().default(0),
  qualitySkipped: integer("quality_skipped").notNull().default(0),
  qualityBlocked: integer("quality_blocked").notNull().default(0),
  createdAt: text("created_at").notNull()
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull()
});
