export const AGENT_PROFILE_LAUNCH_FIELDS_MIGRATION_SQL = `
ALTER TABLE agent_profiles ADD COLUMN working_directory_behavior TEXT DEFAULT 'project_root' NOT NULL;
ALTER TABLE agent_profiles ADD COLUMN prompt_delivery TEXT DEFAULT 'send_to_stdin' NOT NULL;
`;
