export const TASK_CONTRACT_FIELDS_MIGRATION_SQL = `
ALTER TABLE tasks ADD COLUMN goal TEXT;
ALTER TABLE tasks ADD COLUMN context TEXT;
ALTER TABLE tasks ADD COLUMN files_likely_affected TEXT;
ALTER TABLE tasks ADD COLUMN done_definition TEXT;
`;
