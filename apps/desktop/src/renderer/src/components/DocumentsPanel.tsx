import { useState } from "react";
import type {
  DocumentPreviewFile,
  DocumentsPreviewResult
} from "../../../shared/documentTypes";
import type { ProjectSummary } from "../../../shared/projectTypes";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { Dialog } from "./ui/Dialog";
import { cn } from "../lib/cn";

export function DocumentsPanel({ project }: { project: ProjectSummary | null }): React.JSX.Element {
  const [preview, setPreview] = useState<DocumentsPreviewResult | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedFile =
    preview?.files.find((file) => file.name === selectedFileName) ?? preview?.files[0] ?? null;
  const filesToWrite = preview?.files.filter((file) => selectedFiles.has(file.name)) ?? [];

  const loadDefaultPreview = async (): Promise<void> => {
    if (!project) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const result = await window.agentdesk.documents.previewDefaults(project.id);
      setPreview(result);
      setSelectedFileName(result.files[0]?.name ?? null);
      setSelectedFiles(new Set(result.files.map((file: DocumentPreviewFile) => file.name)));
      setMessage("Default documentation preview generated.");
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Failed to generate document preview.");
    } finally {
      setIsBusy(false);
    }
  };

  const loadProgressPreview = async (): Promise<void> => {
    if (!project) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const result = await window.agentdesk.documents.previewProgress(project.id);
      setPreview({
        projectId: result.projectId,
        files: [result.file]
      });
      setSelectedFileName(result.file.name);
      setSelectedFiles(new Set([result.file.name]));
      setMessage("Progress sync preview generated.");
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Failed to generate progress preview.");
    } finally {
      setIsBusy(false);
    }
  };

  const toggleFile = (file: DocumentPreviewFile): void => {
    setSelectedFiles((current) => {
      const next = new Set(current);

      if (next.has(file.name)) {
        next.delete(file.name);
      } else {
        next.add(file.name);
      }

      return next;
    });
  };

  const writeSelectedFiles = async (): Promise<void> => {
    if (!project || !preview || filesToWrite.length === 0) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);
    setConfirmOpen(false);

    try {
      const result = await window.agentdesk.documents.write({
        projectId: project.id,
        files: filesToWrite
      });
      setMessage(`Wrote ${result.writtenFiles.length} markdown file(s).`);
      await loadProgressPreview();
    } catch (writeError) {
      setError(writeError instanceof Error ? writeError.message : "Failed to write markdown files.");
    } finally {
      setIsBusy(false);
    }
  };

  if (!project) {
    return (
      <Card className="border-dashed">
        <CardTitle>No project selected</CardTitle>
        <CardDescription>Open a project before generating documentation.</CardDescription>
      </Card>
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(360px,460px)_1fr]">
      <div className="grid content-start gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Documents</h2>
          <p className="mt-1 text-sm text-muted">{project.path}</p>
        </div>

        {message ? (
          <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-[#bfe9e3]">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-danger/45 bg-danger/10 px-3 py-2 text-sm text-[#ffd0d0]">
            {error}
          </div>
        ) : null}

        <Card>
          <CardTitle>Generate Default Docs</CardTitle>
          <CardDescription>
            Preview README, product, architecture, task, progress, security, testing, prompt, and known-issue docs.
          </CardDescription>
          <Button className="mt-3" disabled={isBusy} onClick={() => void loadDefaultPreview()} variant="primary">
            Preview Default Docs
          </Button>
        </Card>

        <Card>
          <CardTitle>Sync Progress</CardTitle>
          <CardDescription>
            Preview PROGRESS.md from current task statuses, recent runs, and recent quality results.
          </CardDescription>
          <Button className="mt-3" disabled={isBusy} onClick={() => void loadProgressPreview()} variant="primary">
            Preview Progress Sync
          </Button>
        </Card>

        {preview ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted">Preview Files</h3>
              <Button
                disabled={isBusy || filesToWrite.length === 0}
                onClick={() => setConfirmOpen(true)}
                variant="primary"
              >
                Write Selected
              </Button>
            </div>
            <div className="grid gap-2">
              {preview.files.map((file) => (
                <div
                  className={cn(
                    "grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border bg-panel px-2 py-2",
                    selectedFile?.name === file.name ? "border-accent/60" : "border-border"
                  )}
                  key={file.name}
                >
                  <input
                    checked={selectedFiles.has(file.name)}
                    onChange={() => toggleFile(file)}
                    type="checkbox"
                  />
                  <button
                    className="min-w-0 text-left"
                    onClick={() => setSelectedFileName(file.name)}
                    type="button"
                  >
                    <span className="block truncate text-sm font-bold text-text">{file.name}</span>
                    <span className="mt-1 block truncate text-xs text-muted">{file.path}</span>
                  </button>
                  <Badge variant={file.exists ? "warning" : "success"}>{file.exists ? "Overwrite" : "New"}</Badge>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>

      <DocumentPreview file={selectedFile} />

      <Dialog
        description="AgentDesk will write only the selected markdown files inside the current project folder."
        onClose={() => setConfirmOpen(false)}
        open={confirmOpen}
        title="Write selected markdown files?"
      >
        <div className="grid gap-3">
          <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-[#0d1117] p-3 text-xs text-muted">
            {filesToWrite.map((file) => `${file.exists ? "Overwrite" : "Create"} ${file.name}`).join("\n")}
          </pre>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button onClick={() => setConfirmOpen(false)} variant="ghost">
              Cancel
            </Button>
            <Button disabled={isBusy} onClick={() => void writeSelectedFiles()} variant="primary">
              Write Files
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}

function DocumentPreview({ file }: { file: DocumentPreviewFile | null }): React.JSX.Element {
  if (!file) {
    return (
      <Card className="border-dashed">
        <CardTitle>Markdown Preview</CardTitle>
        <CardDescription>Generate a preview before writing documentation.</CardDescription>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{file.name}</CardTitle>
          <CardDescription className="break-all">{file.path}</CardDescription>
        </div>
        <Badge variant={file.exists ? "warning" : "success"}>{file.exists ? "Will overwrite" : "Will create"}</Badge>
      </div>
      <pre className="mt-3 max-h-[660px] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-[#0d1117] p-3 text-xs leading-relaxed text-muted">
        {file.content}
      </pre>
    </Card>
  );
}
