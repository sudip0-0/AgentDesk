export const defaultDocumentNames = [
  "README.md",
  "PRODUCT.md",
  "ARCHITECTURE.md",
  "TASKS.md",
  "PROGRESS.md",
  "DECISIONS.md",
  "TESTING.md",
  "SECURITY.md",
  "AGENTS.md",
  "PROMPTS.md",
  "KNOWN_ISSUES.md"
] as const;

export type DefaultDocumentName = (typeof defaultDocumentNames)[number];

export interface DocumentPreviewFile {
  name: DefaultDocumentName;
  path: string;
  content: string;
  exists: boolean;
}

export interface DocumentsPreviewResult {
  projectId: string;
  files: DocumentPreviewFile[];
}

export interface DocumentsWriteInput {
  projectId: string;
  files: DocumentPreviewFile[];
}

export interface DocumentsWriteResult {
  writtenFiles: string[];
}

export interface ProgressPreviewResult {
  projectId: string;
  file: DocumentPreviewFile;
}
