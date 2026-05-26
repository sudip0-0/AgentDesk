import type { ProjectSummary } from "./projectTypes.js";
import type { TaskRecord } from "./taskTypes.js";

export const promptTemplateIds = ["implementation", "review", "fix", "test", "security"] as const;

export type PromptTemplateId = (typeof promptTemplateIds)[number];

export interface PromptTemplate {
  id: PromptTemplateId;
  label: string;
  description: string;
}

export const promptTemplates: PromptTemplate[] = [
  {
    id: "implementation",
    label: "Implementation",
    description: "Build the selected task with focused code changes and verification."
  },
  {
    id: "review",
    label: "Review",
    description: "Audit the implementation against the task contract and project constraints."
  },
  {
    id: "fix",
    label: "Fix",
    description: "Correct failed checks, review findings, or incomplete acceptance criteria."
  },
  {
    id: "test",
    label: "Test",
    description: "Add or improve tests for the selected task without broad production refactors."
  },
  {
    id: "security",
    label: "Security",
    description: "Review security-sensitive areas and Electron boundary risks."
  }
];

export interface PromptContext {
  project: Pick<ProjectSummary, "name" | "path">;
  task: TaskRecord;
}

const defaultDocsToRead = [
  "README.md",
  "ARCHITECTURE.md",
  "TASKS.md",
  "SECURITY.md",
  "TESTING.md"
];

const fallback = (value: string, fallbackValue = "Not specified."): string =>
  value.trim().length > 0 ? value.trim() : fallbackValue;

const buildReadFirstSection = (task: TaskRecord): string => {
  const taskFiles = task.filesLikelyAffected
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const files = [...defaultDocsToRead, ...taskFiles];

  return files.map((file) => `- ${file}`).join("\n");
};

const buildContractSections = (context: PromptContext): string => {
  const { task } = context;

  return [
    `Task ID: ${task.id}`,
    `Task title: ${task.title}`,
    `Task status: ${task.status}`,
    `Priority: ${task.priority}`,
    "",
    "## Goal",
    fallback(task.goal),
    "",
    "## Description",
    fallback(task.description),
    "",
    "## Context",
    fallback(task.context),
    "",
    "## Acceptance Criteria",
    fallback(task.acceptanceCriteria),
    "",
    "## Quality Commands",
    fallback(task.qualityCommands),
    "",
    "## Security Notes",
    fallback(task.securityNotes),
    "",
    "## Done Definition",
    fallback(task.doneDefinition),
    "",
    "## Dependencies",
    fallback(task.dependsOn)
  ].join("\n");
};

const buildSharedRules = (): string =>
  [
    "- Read the task contract and listed files before editing code.",
    "- Implement only the selected task.",
    "- Do not edit unrelated files or perform speculative refactors.",
    "- Preserve Electron security boundaries: renderer uses preload APIs, main process owns filesystem, database, terminal, and shell access.",
    "- Do not remove safety confirmations or bypass validation.",
    "- Run the listed quality commands before claiming completion.",
    "- Report checks honestly, including commands that fail or do not exist.",
    "- Report changed files, risks, incomplete areas, and follow-up tasks."
  ].join("\n");

const buildHeader = (context: PromptContext, role: string): string =>
  [
    `You are working in project "${context.project.name}".`,
    `Project path: ${context.project.path}`,
    `Role: ${role}`,
    ""
  ].join("\n");

const buildImplementationPrompt = (context: PromptContext): string =>
  [
    buildHeader(context, "Implementation Agent"),
    "Implement the selected AgentDesk task end-to-end.",
    "",
    buildContractSections(context),
    "",
    "## Files And Docs To Read First",
    buildReadFirstSection(context.task),
    "",
    "## Implementation Rules",
    buildSharedRules(),
    "",
    "## Output Format",
    "Summary:",
    "Files changed:",
    "Checks run:",
    "Risks:",
    "Follow-up tasks:"
  ].join("\n");

const buildReviewPrompt = (context: PromptContext): string =>
  [
    buildHeader(context, "Review Agent"),
    "Review the current implementation for the selected task. Findings are the priority.",
    "",
    buildContractSections(context),
    "",
    "## Files And Docs To Read First",
    buildReadFirstSection(context.task),
    "",
    "## Review Checklist",
    "- Acceptance criteria are met.",
    "- Architecture boundaries are preserved.",
    "- Electron IPC, filesystem, shell, terminal, and database access are safe.",
    "- Tests cover practical behavior and edge cases.",
    "- Windows compatibility is preserved.",
    "- No unrelated files or behavior were changed.",
    "- Error handling is honest and visible.",
    "- Report checks honestly, including commands that fail or do not exist.",
    "",
    "## Output Verdict",
    "Pass",
    "Needs Fix",
    "Blocked"
  ].join("\n");

const buildFixPrompt = (context: PromptContext): string =>
  [
    buildHeader(context, "Fix Agent"),
    "Fix only the issues that prevent this task from meeting its contract. Do not broaden scope.",
    "",
    buildContractSections(context),
    "",
    "## Files And Docs To Read First",
    buildReadFirstSection(context.task),
    "",
    "## Fix Instructions",
    "- Reproduce or inspect the failed check, review finding, or incomplete criterion first.",
    "- Change only the files needed for the listed problem.",
    "- Do not edit unrelated files or perform speculative refactors.",
    "- Preserve previous valid work.",
    "- Re-run the failed checks and any related quality commands.",
    "- Report checks honestly. If a check still fails, report the exact failure.",
    "",
    "## Output Format",
    "What was fixed:",
    "Files changed:",
    "Checks run:",
    "Remaining risks:"
  ].join("\n");

const buildTestPrompt = (context: PromptContext): string =>
  [
    buildHeader(context, "Test Agent"),
    "Add or improve tests for the selected task while avoiding unrelated production changes.",
    "",
    buildContractSections(context),
    "",
    "## Files And Docs To Read First",
    buildReadFirstSection(context.task),
    "",
    "## Test Instructions",
    "- Prefer pure logic and repository tests before brittle UI tests.",
    "- Add production code only when required for testability.",
    "- Do not edit unrelated files or perform speculative refactors.",
    "- Cover invalid inputs, persistence, status transitions, and prompt/task contract behavior where applicable.",
    "- Run the listed quality commands before finishing.",
    "- Report checks honestly, including commands that fail or cannot be run.",
    "",
    "## Output Format",
    "Tests added:",
    "Files changed:",
    "Checks run:",
    "Risks:"
  ].join("\n");

const buildSecurityPrompt = (context: PromptContext): string =>
  [
    buildHeader(context, "Security Agent"),
    "Review the selected task for security regressions and unsafe local automation behavior.",
    "",
    buildContractSections(context),
    "",
    "## Files And Docs To Read First",
    buildReadFirstSection(context.task),
    "",
    "## Security Checklist",
    "- Renderer does not access Node, filesystem, child_process, shell, or database directly.",
    "- IPC input is validated and narrow.",
    "- Project file operations stay inside selected project folders.",
    "- Terminal and shell commands remain visible and user-controlled.",
    "- Destructive actions keep confirmations.",
    "- Secrets are not logged, stored, or exposed.",
    "- Git destructive operations are not automatic.",
    "- Do not edit unrelated files or perform speculative refactors.",
    "- Report checks honestly, including commands that fail or cannot be run.",
    "",
    "## Output Format",
    "Verdict:",
    "Findings:",
    "Checks run:",
    "Risks:"
  ].join("\n");

export const buildPrompt = (templateId: PromptTemplateId, context: PromptContext): string => {
  switch (templateId) {
    case "implementation":
      return buildImplementationPrompt(context);
    case "review":
      return buildReviewPrompt(context);
    case "fix":
      return buildFixPrompt(context);
    case "test":
      return buildTestPrompt(context);
    case "security":
      return buildSecurityPrompt(context);
  }
};
