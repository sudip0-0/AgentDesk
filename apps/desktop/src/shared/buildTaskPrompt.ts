import type { TaskRecord } from "./taskTypes.js";

export const buildImplementationPrompt = (
  task: Pick<
    TaskRecord,
    | "title"
    | "description"
    | "goal"
    | "context"
    | "acceptanceCriteria"
    | "filesLikelyAffected"
    | "qualityCommands"
    | "securityNotes"
    | "doneDefinition"
    | "dependsOn"
  >,
  projectName: string
): string => {
  const sections: string[] = [
    `Implement the following task for project "${projectName}".`,
    "",
    `## Task: ${task.title}`,
    ""
  ];

  if (task.goal) {
    sections.push("## Goal", task.goal, "");
  }

  if (task.description) {
    sections.push("## Description", task.description, "");
  }

  if (task.context) {
    sections.push("## Context", task.context, "");
  }

  if (task.acceptanceCriteria) {
    sections.push("## Acceptance Criteria", task.acceptanceCriteria, "");
  }

  if (task.filesLikelyAffected) {
    sections.push("## Files Likely Affected", task.filesLikelyAffected, "");
  }

  if (task.qualityCommands) {
    sections.push("## Quality Commands", task.qualityCommands, "");
  }

  if (task.securityNotes) {
    sections.push("## Security Notes", task.securityNotes, "");
  }

  if (task.doneDefinition) {
    sections.push("## Done Definition", task.doneDefinition, "");
  }

  if (task.dependsOn) {
    sections.push("## Dependencies", task.dependsOn, "");
  }

  sections.push(
    "## Rules",
    "- Implement only what this task requires.",
    "- Do not change unrelated files.",
    "- Run the quality commands before finishing.",
    "- Report risks and follow-up work."
  );

  return sections.join("\n");
};
