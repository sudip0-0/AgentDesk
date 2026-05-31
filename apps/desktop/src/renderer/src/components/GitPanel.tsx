import { useCallback, useEffect, useState } from "react";
import { branchNameFromTaskTitle, buildGeneratedCommitMessage } from "../../../shared/gitHelpers";
import type { GitChangedFile, GitDiffResult, GitStatusResult } from "../../../shared/gitTypes";
import type { ProjectSummary } from "../../../shared/projectTypes";
import type { TaskRecord } from "../../../shared/taskTypes";
import { useAppSettings } from "../hooks/useAppSettings";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { DiffView } from "./ui/DiffView";
import { Dialog } from "./ui/Dialog";
import { EmptyState } from "./ui/EmptyState";
import { Input } from "./ui/Input";
import { PageHeader } from "./ui/PageHeader";
import { SkeletonCard } from "./ui/Skeleton";
import { cn } from "../lib/cn";

const emptyStatus: GitStatusResult = {
  isGitRepo: false,
  branch: null,
  files: [],
  stagedFiles: [],
  unstagedFiles: [],
  message: null
};

const statusLabel = (file: GitChangedFile): string => {
  if (file.status === "staged_unstaged") {
    return "staged + unstaged";
  }

  return file.status.replace("_", " ");
};

export function GitPanel({ project }: { project: ProjectSummary | null }): React.JSX.Element {
  const settings = useAppSettings();
  const [status, setStatus] = useState<GitStatusResult>(emptyStatus);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [diff, setDiff] = useState<GitDiffResult | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [branchName, setBranchName] = useState("");
  const [commitMessage, setCommitMessage] = useState("");
  const [commitConfirmOpen, setCommitConfirmOpen] = useState(false);
  const [branchConfirmOpen, setBranchConfirmOpen] = useState(false);
  const [viewStagedDiff, setViewStagedDiff] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedFile =
    status.files.find((file) => file.path === selectedFilePath) ?? status.files[0] ?? null;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  const canToggleDiff = selectedFile?.status === "staged_unstaged";

  useEffect(() => {
    if (!selectedFile) {
      return;
    }

    if (selectedFile.status === "staged") {
      setViewStagedDiff(true);
      return;
    }

    if (selectedFile.status === "staged_unstaged") {
      setViewStagedDiff(false);
      return;
    }

    setViewStagedDiff(false);
  }, [selectedFile]);

  const loadGitData = useCallback(async (projectId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const [loadedStatus, loadedTasks] = await Promise.all([
        window.agentdesk.git.getStatus(projectId),
        window.agentdesk.tasks.list(projectId)
      ]);
      setStatus(loadedStatus);
      setTasks(loadedTasks);
      setSelectedFilePath((current) =>
        current && loadedStatus.files.some((file: GitChangedFile) => file.path === current)
          ? current
          : loadedStatus.files[0]?.path ?? null
      );
      setSelectedFiles(
        (current) =>
          new Set(
            [...current].filter((filePath) =>
              loadedStatus.files.some((file: GitChangedFile) => file.path === filePath)
            )
          )
      );
      setCommitMessage((current) => current || buildGeneratedCommitMessage(null, loadedStatus.stagedFiles));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load git status.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setMessage(null);
    setError(null);
    setDiff(null);
    setSelectedFiles(new Set());

    if (!project) {
      setStatus(emptyStatus);
      setTasks([]);
      setSelectedFilePath(null);
      return;
    }

    void loadGitData(project.id);
  }, [loadGitData, project]);

  useEffect(() => {
    if (!project || !selectedFile || !status.isGitRepo) {
      setDiff(null);
      return;
    }

    let cancelled = false;

    void window.agentdesk.git
      .getDiff({
        projectId: project.id,
        filePath: selectedFile.path,
        staged: viewStagedDiff,
        fileStatus: selectedFile.status
      })
      .then((loadedDiff: GitDiffResult) => {
        if (!cancelled) {
          setDiff(loadedDiff);
        }
      })
      .catch((diffError: unknown) => {
        if (!cancelled) {
          setDiff(null);
          setError(diffError instanceof Error ? diffError.message : "Failed to load diff.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [project, selectedFile, status.isGitRepo, viewStagedDiff]);

  const refresh = async (): Promise<void> => {
    if (project) {
      await loadGitData(project.id);
    }
  };

  // Skip the confirmation dialog when the user has disabled git confirmations.
  const requestCreateBranch = (): void => {
    if (settings.confirmDestructiveGit) {
      setBranchConfirmOpen(true);
    } else {
      void createBranch();
    }
  };

  const requestCommit = (): void => {
    if (settings.confirmDestructiveGit) {
      setCommitConfirmOpen(true);
    } else {
      void commitStagedChanges();
    }
  };

  const toggleFile = (filePath: string): void => {
    setSelectedFiles((current) => {
      const next = new Set(current);

      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }

      return next;
    });
  };

  const createBranch = async (): Promise<void> => {
    if (!project) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const updatedStatus = await window.agentdesk.git.createBranch({
        projectId: project.id,
        branchName
      });
      setStatus(updatedStatus);
      setMessage(`Created and switched to ${branchName}.`);
    } catch (branchError) {
      setError(branchError instanceof Error ? branchError.message : "Failed to create branch.");
    } finally {
      setIsBusy(false);
    }
  };

  const stageSelectedFiles = async (): Promise<void> => {
    if (!project || selectedFiles.size === 0) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);

    try {
      const updatedStatus = await window.agentdesk.git.stageFiles({
        projectId: project.id,
        filePaths: [...selectedFiles]
      });
      setStatus(updatedStatus);
      setSelectedFiles(new Set());
      setCommitMessage(buildGeneratedCommitMessage(selectedTask?.title ?? null, updatedStatus.stagedFiles));
      setMessage("Selected files staged.");
    } catch (stageError) {
      setError(stageError instanceof Error ? stageError.message : "Failed to stage files.");
    } finally {
      setIsBusy(false);
    }
  };

  const commitStagedChanges = async (): Promise<void> => {
    if (!project) {
      return;
    }

    setIsBusy(true);
    setError(null);
    setMessage(null);
    setCommitConfirmOpen(false);

    try {
      const result = await window.agentdesk.git.commit({
        projectId: project.id,
        message: commitMessage
      });
      setMessage(result.commitHash ? `Commit ${result.commitHash} created.` : result.summary);
      await refresh();
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : "Failed to commit changes.");
    } finally {
      setIsBusy(false);
    }
  };

  const applyTaskBranchName = (taskId: string): void => {
    setSelectedTaskId(taskId);
    const task = tasks.find((item) => item.id === taskId);

    if (task) {
      setBranchName(branchNameFromTaskTitle(task.title));
      setCommitMessage(buildGeneratedCommitMessage(task.title, status.stagedFiles));
    }
  };

  if (!project) {
    return (
      <EmptyState
        description="Open a project before viewing git status."
        title="No project selected"
      />
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(360px,460px)_1fr]">
      <div className="grid content-start gap-3">
        <PageHeader
          actions={
            <Button disabled={isLoading} onClick={() => void refresh()} variant="secondary">
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          }
          subtitle={project.path}
          title="Git Status"
        />

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

        {isLoading && status.files.length === 0 ? (
          <SkeletonCard lines={2} />
        ) : (
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>{status.isGitRepo ? status.branch ?? "Unknown branch" : "Not a git repo"}</CardTitle>
                <CardDescription>
                  {status.message ?? `${status.files.length} changed file(s) detected.`}
                </CardDescription>
              </div>
              <Badge variant={status.isGitRepo ? "success" : "warning"}>Git</Badge>
            </div>
          </Card>
        )}

        {status.isGitRepo ? (
          <>
            <Card>
              <CardTitle>Create Branch From Task</CardTitle>
              <div className="mt-3 grid gap-3">
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold text-muted">Task</span>
                  <select
                    className="w-full rounded-md border border-border bg-inset px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
                    onChange={(event) => applyTaskBranchName(event.target.value)}
                    value={selectedTaskId}
                  >
                    <option value="">Select task</option>
                    {tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Branch Name"
                  onChange={(event) => setBranchName(event.target.value)}
                  value={branchName}
                />
                <Button
                  disabled={isBusy || branchName.trim().length === 0}
                  onClick={requestCreateBranch}
                  variant="primary"
                >
                  Create Branch
                </Button>
              </div>
            </Card>

            <FileList
              allowStageSelection
              files={status.unstagedFiles}
              selectedFilePath={selectedFile?.path ?? null}
              selectedFiles={selectedFiles}
              title="Unstaged Files"
              onSelectFile={setSelectedFilePath}
              onToggleFile={toggleFile}
            />

            <Button disabled={isBusy || selectedFiles.size === 0} onClick={() => void stageSelectedFiles()} variant="primary">
              Stage Selected Files
            </Button>

            <FileList
              files={status.stagedFiles}
              selectedFilePath={selectedFile?.path ?? null}
              selectedFiles={selectedFiles}
              title="Staged Files"
              onSelectFile={setSelectedFilePath}
              onToggleFile={toggleFile}
            />
          </>
        ) : null}
      </div>

      <section className="grid content-start gap-3">
        <GitDiffViewer
          canToggleDiff={canToggleDiff}
          diff={diff}
          file={selectedFile}
          onViewStagedDiffChange={setViewStagedDiff}
          viewStagedDiff={viewStagedDiff}
        />

        {status.isGitRepo ? (
          <Card>
            <CardTitle>Commit</CardTitle>
            <CardDescription>
              Review the staged files and edit the generated message before confirming.
            </CardDescription>
            <label className="mt-3 grid gap-1.5">
              <span className="text-xs font-bold text-muted">Commit Message</span>
              <textarea
                className="min-h-40 w-full resize-y rounded-md border border-border bg-inset px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
                onChange={(event) => setCommitMessage(event.target.value)}
                value={commitMessage}
              />
            </label>
            <div className="mt-3 flex justify-end">
              <Button
                disabled={isBusy || status.stagedFiles.length === 0 || commitMessage.trim().length === 0}
                onClick={requestCommit}
                variant="primary"
              >
                Commit Staged Changes
              </Button>
            </div>
          </Card>
        ) : null}
      </section>

      <Dialog
        description="This checks out a new branch in your local repository. Uncommitted changes will move with the checkout."
        onClose={() => setBranchConfirmOpen(false)}
        open={branchConfirmOpen}
        title={`Create branch "${branchName}"?`}
      >
        {status.files.length > 0 ? (
          <p className="text-sm text-muted">
            You have {status.files.length} changed file(s) in the working tree. Review them before switching
            branches.
          </p>
        ) : (
          <p className="text-sm text-muted">The working tree is clean.</p>
        )}
        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
          <Button onClick={() => setBranchConfirmOpen(false)} variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={isBusy}
            onClick={() => {
              setBranchConfirmOpen(false);
              void createBranch();
            }}
            variant="primary"
          >
            Create Branch
          </Button>
        </div>
      </Dialog>

      <Dialog
        description="AgentDesk will create a local commit only. It will not push to a remote."
        onClose={() => setCommitConfirmOpen(false)}
        open={commitConfirmOpen}
        title="Commit staged changes?"
      >
        <div className="grid gap-3">
          <div className="rounded-md border border-border bg-code p-3 text-sm text-muted">
            <span className="font-bold text-text">{status.stagedFiles.length} staged file(s)</span>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs">
              {status.stagedFiles.map((file) => file.path).join("\n")}
            </pre>
          </div>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-code p-3 text-xs text-muted">
            {commitMessage}
          </pre>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button onClick={() => setCommitConfirmOpen(false)} variant="ghost">
              Cancel
            </Button>
            <Button disabled={isBusy} onClick={() => void commitStagedChanges()} variant="primary">
              Commit
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}

function FileList({
  files,
  title,
  selectedFilePath,
  selectedFiles,
  allowStageSelection = false,
  onSelectFile,
  onToggleFile
}: {
  files: GitChangedFile[];
  title: string;
  selectedFilePath: string | null;
  selectedFiles: Set<string>;
  allowStageSelection?: boolean;
  onSelectFile: (filePath: string) => void;
  onToggleFile: (filePath: string) => void;
}): React.JSX.Element {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      {files.length === 0 ? <CardDescription>No files in this group.</CardDescription> : null}
      <div className="mt-3 grid gap-2">
        {files.map((file) => (
          <div
            className={cn(
              "grid grid-cols-[auto_1fr] items-center gap-2 rounded-md border bg-inset px-2 py-2",
              file.path === selectedFilePath ? "border-accent/60" : "border-border"
            )}
            key={`${title}-${file.path}`}
          >
            {allowStageSelection ? (
              <input
                checked={selectedFiles.has(file.path)}
                onChange={() => onToggleFile(file.path)}
                type="checkbox"
              />
            ) : (
              <span className="h-4 w-4" />
            )}
            <button className="min-w-0 text-left" onClick={() => onSelectFile(file.path)} type="button">
              <span className="block truncate text-sm font-bold text-text">{file.path}</span>
              <span className="mt-1 block text-xs text-muted">{statusLabel(file)}</span>
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function GitDiffViewer({
  file,
  diff,
  canToggleDiff,
  viewStagedDiff,
  onViewStagedDiffChange
}: {
  file: GitChangedFile | null;
  diff: GitDiffResult | null;
  canToggleDiff: boolean;
  viewStagedDiff: boolean;
  onViewStagedDiffChange: (viewStaged: boolean) => void;
}): React.JSX.Element {
  if (!file) {
    return (
      <EmptyState description="Select a changed file to view its diff." title="Diff Viewer" />
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{file.path}</CardTitle>
          <CardDescription>{statusLabel(file)}</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canToggleDiff ? (
            <>
              <Button
                onClick={() => onViewStagedDiffChange(false)}
                size="sm"
                variant={viewStagedDiff ? "ghost" : "secondary"}
              >
                Unstaged
              </Button>
              <Button
                onClick={() => onViewStagedDiffChange(true)}
                size="sm"
                variant={viewStagedDiff ? "secondary" : "ghost"}
              >
                Staged
              </Button>
            </>
          ) : null}
          <Badge>{diff?.staged ? "Staged Diff" : "Unstaged Diff"}</Badge>
        </div>
      </div>

      {diff?.message ? (
        <div className="mt-3 rounded-md border border-border bg-inset px-3 py-2 text-sm text-muted">
          {diff.message}
        </div>
      ) : null}

      <DiffView className="mt-3 max-h-[560px]" diff={diff?.diff ?? ""} />
    </Card>
  );
}
