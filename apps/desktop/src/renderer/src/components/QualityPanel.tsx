import { useCallback, useEffect, useState } from "react";
import type {
  QualityCheckRecord,
  QualityCheckStatus,
  QualityCommandInput,
  QualityCommandRecord,
  QualityRunContext
} from "../../../shared/qualityTypes";
import type { ProjectSummary } from "../../../shared/projectTypes";
import type { QualityActionRequestType, UiActionRequest } from "../../../shared/uiActionTypes";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { Dialog } from "./ui/Dialog";
import { Input } from "./ui/Input";
import { cn } from "../lib/cn";

const statusVariant = (status: QualityCheckStatus): "success" | "danger" | "warning" => {
  if (status === "passed") {
    return "success";
  }

  if (status === "skipped") {
    return "warning";
  }

  return "danger";
};

const emptyCommand = (projectId: string): QualityCommandInput => ({
  projectId,
  label: "",
  command: "",
  required: true,
  timeoutMs: 120_000
});

const summarizeRunResults = (results: QualityCheckRecord[]): string => {
  const requiredFailures = results.filter((result) => result.status === "failed").length;
  const skippedOptional = results.filter((result) => result.status === "skipped").length;

  if (requiredFailures > 0) {
    return `${requiredFailures} required check(s) failed.`;
  }

  if (skippedOptional > 0) {
    return `Quality checks finished with ${skippedOptional} optional check(s) skipped.`;
  }

  return "All quality checks passed.";
};

export function QualityPanel({
  project,
  runContext,
  actionRequest,
  onClearRunContext,
  onActionHandled,
  onFixTaskCreated
}: {
  project: ProjectSummary | null;
  runContext?: QualityRunContext | null;
  actionRequest?: UiActionRequest<QualityActionRequestType> | null;
  onClearRunContext?: () => void;
  onActionHandled?: () => void;
  onFixTaskCreated: () => void;
}): React.JSX.Element {
  const [commands, setCommands] = useState<QualityCommandRecord[]>([]);
  const [checks, setChecks] = useState<QualityCheckRecord[]>([]);
  const [draft, setDraft] = useState<QualityCommandInput | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [runConfirmOpen, setRunConfirmOpen] = useState(false);
  const [deleteConfirmCommand, setDeleteConfirmCommand] = useState<QualityCommandRecord | null>(null);

  const selectedCheck = checks.find((check) => check.id === selectedCheckId) ?? checks[0] ?? null;

  const loadQualityData = useCallback(async (projectId: string): Promise<void> => {
    setError(null);

    try {
      const [loadedCommands, loadedChecks]: [QualityCommandRecord[], QualityCheckRecord[]] = await Promise.all([
        window.agentdesk.quality.listCommands(projectId),
        window.agentdesk.quality.listChecks({
          projectId,
          taskId: runContext?.taskId ?? undefined,
          agentRunId: runContext?.agentRunId ?? undefined
        })
      ]);

      setCommands(loadedCommands);
      setChecks(loadedChecks);
      setSelectedCheckId((current) =>
        current && loadedChecks.some((check) => check.id === current) ? current : loadedChecks[0]?.id ?? null
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load quality data.");
    }
  }, [runContext?.agentRunId, runContext?.taskId]);

  useEffect(() => {
    setMessage(null);
    setError(null);
    setDraft(null);
    setEditingId(null);

    if (!project) {
      setCommands([]);
      setChecks([]);
      setSelectedCheckId(null);
      return;
    }

    void loadQualityData(project.id);
  }, [loadQualityData, project]);

  useEffect(() => {
    if (!actionRequest || actionRequest.type !== "run-all") {
      return;
    }

    if (commands.length === 0) {
      setMessage("Add a quality command before running checks.");
    } else {
      setRunConfirmOpen(true);
    }

    onActionHandled?.();
  }, [actionRequest, commands.length, onActionHandled]);

  const openCreate = (): void => {
    if (!project) {
      return;
    }

    setEditingId(null);
    setDraft(emptyCommand(project.id));
  };

  const openEdit = (command: QualityCommandRecord): void => {
    setEditingId(command.id);
    setDraft({
      projectId: command.projectId,
      label: command.label,
      command: command.command,
      required: command.required,
      timeoutMs: command.timeoutMs
    });
  };

  const saveDraft = async (): Promise<void> => {
    if (!project || !draft) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (editingId) {
        await window.agentdesk.quality.updateCommand({ ...draft, id: editingId });
        setMessage("Quality command updated.");
      } else {
        await window.agentdesk.quality.createCommand(draft);
        setMessage("Quality command added.");
      }

      setDraft(null);
      setEditingId(null);
      await loadQualityData(project.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save quality command.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteCommand = async (): Promise<void> => {
    if (!project || !deleteConfirmCommand) {
      return;
    }

    setError(null);

    try {
      await window.agentdesk.quality.deleteCommand({
        projectId: project.id,
        id: deleteConfirmCommand.id
      });
      setMessage("Quality command deleted.");
      setDeleteConfirmCommand(null);
      await loadQualityData(project.id);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete quality command.");
    }
  };

  const executeRun = async (): Promise<void> => {
    if (!project) {
      return;
    }

    setIsRunning(true);
    setError(null);
    setMessage(null);
    setRunConfirmOpen(false);

    try {
      const results = await window.agentdesk.quality.run({
        projectId: project.id,
        taskId: runContext?.taskId ?? undefined,
        agentRunId: runContext?.agentRunId ?? undefined
      });
      setChecks(results);
      setSelectedCheckId(results[0]?.id ?? null);
      setMessage(summarizeRunResults(results));
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Failed to run quality checks.");
    } finally {
      setIsRunning(false);
    }
  };

  const createFixTask = async (check: QualityCheckRecord): Promise<void> => {
    if (!project) {
      return;
    }

    setError(null);

    try {
      await window.agentdesk.quality.createFixTask({
        projectId: project.id,
        qualityCheckId: check.id
      });
      setMessage("Fix task created.");
      onFixTaskCreated();
    } catch (fixError) {
      setError(fixError instanceof Error ? fixError.message : "Failed to create fix task.");
    }
  };

  if (!project) {
    return (
      <Card className="border-dashed">
        <CardTitle>No project selected</CardTitle>
        <CardDescription>Open a project before configuring quality checks.</CardDescription>
      </Card>
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(360px,460px)_1fr]">
      <div className="grid content-start gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Quality Commands</h2>
            <p className="mt-1 text-sm text-muted">Commands run in {project.name}.</p>
          </div>
          <Button onClick={openCreate} variant="primary">
            Add Command
          </Button>
        </div>

        {runContext?.taskId || runContext?.agentRunId ? (
          <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-[#bfe9e3]">
            <p>
              Linked context:
              {runContext.taskTitle ? ` task "${runContext.taskTitle}"` : ""}
              {runContext.agentRunId ? ` · run ${runContext.agentRunId.slice(0, 8)}` : ""}
            </p>
            {onClearRunContext ? (
              <Button className="mt-2" onClick={onClearRunContext} size="sm" variant="ghost">
                Clear link
              </Button>
            ) : null}
          </div>
        ) : null}

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

        <Button
          disabled={isRunning || commands.length === 0}
          onClick={() => setRunConfirmOpen(true)}
          variant="primary"
        >
          {isRunning ? "Running..." : "Run All Checks"}
        </Button>

        {commands.map((command) => (
          <Card key={command.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>{command.label}</CardTitle>
                <CardDescription className="break-all">{command.command}</CardDescription>
              </div>
              <Badge variant={command.required ? "warning" : "default"}>
                {command.required ? "Required" : "Optional"}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted">
              Timeout: {command.timeoutMs ? `${command.timeoutMs}ms` : "none"}
            </p>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => openEdit(command)} size="sm" variant="secondary">
                Edit
              </Button>
              <Button onClick={() => setDeleteConfirmCommand(command)} size="sm" variant="danger">
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <section className="grid content-start gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Recent Results</h2>

        {checks.length === 0 ? (
          <Card className="border-dashed">
            <CardTitle>No quality results</CardTitle>
            <CardDescription>Run checks to capture stdout, stderr, exit code, and timing.</CardDescription>
          </Card>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-[minmax(260px,360px)_1fr]">
          <div className="grid content-start gap-2">
            {checks.map((check) => (
              <button
                className={cn(
                  "rounded-lg border bg-panel p-3 text-left transition hover:bg-panel-strong",
                  check.id === selectedCheck?.id ? "border-accent/60" : "border-border"
                )}
                key={check.id}
                onClick={() => setSelectedCheckId(check.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-text">{check.label}</span>
                  <Badge variant={statusVariant(check.status)}>{check.status}</Badge>
                </div>
                <span className="mt-1 block truncate text-xs text-muted">{check.command}</span>
              </button>
            ))}
          </div>

          <QualityResultDetail check={selectedCheck} onCreateFixTask={(check) => void createFixTask(check)} />
        </div>
      </section>

      <Dialog
        description="Commands run in the selected project folder with shell execution. Review the list before continuing."
        onClose={() => setRunConfirmOpen(false)}
        open={runConfirmOpen}
        title="Run all quality checks?"
      >
        <ul className="grid gap-2 text-sm text-muted">
          {commands.map((command) => (
            <li className="rounded-md border border-border bg-[#0d1117] px-3 py-2" key={command.id}>
              <span className="font-bold text-text">{command.label}</span>
              <span className="mt-1 block break-all">{command.command}</span>
              <span className="mt-1 block text-xs">
                {command.required ? "Required" : "Optional"}
                {command.timeoutMs ? ` · timeout ${command.timeoutMs}ms` : ""}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
          <Button onClick={() => setRunConfirmOpen(false)} variant="ghost">
            Cancel
          </Button>
          <Button disabled={isRunning} onClick={() => void executeRun()} variant="primary">
            Run Checks
          </Button>
        </div>
      </Dialog>

      <Dialog
        description="This removes the command from the project configuration. Existing check history is kept."
        onClose={() => setDeleteConfirmCommand(null)}
        open={deleteConfirmCommand !== null}
        title={deleteConfirmCommand ? `Delete "${deleteConfirmCommand.label}"?` : "Delete command"}
      >
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button onClick={() => setDeleteConfirmCommand(null)} variant="ghost">
            Cancel
          </Button>
          <Button onClick={() => void confirmDeleteCommand()} variant="danger">
            Delete Command
          </Button>
        </div>
      </Dialog>

      <QualityCommandDialog
        draft={draft}
        isSaving={isSaving}
        mode={editingId ? "edit" : "create"}
        onChange={setDraft}
        onClose={() => {
          setDraft(null);
          setEditingId(null);
        }}
        onSave={() => void saveDraft()}
      />
    </section>
  );
}

function QualityResultDetail({
  check,
  onCreateFixTask
}: {
  check: QualityCheckRecord | null;
  onCreateFixTask: (check: QualityCheckRecord) => void;
}): React.JSX.Element {
  if (!check) {
    return (
      <Card className="border-dashed">
        <CardTitle>Result Detail</CardTitle>
        <CardDescription>Select a quality result.</CardDescription>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{check.label}</CardTitle>
          <CardDescription className="break-all">{check.command}</CardDescription>
        </div>
        <Badge variant={statusVariant(check.status)}>{check.status}</Badge>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-muted">
        <span>Exit code: {check.exitCode ?? "none"}</span>
        <span>Started: {check.startedAt}</span>
        <span>Finished: {check.finishedAt ?? "not finished"}</span>
        <span>Task: {check.taskId ?? "none"} · Run: {check.agentRunId ?? "none"}</span>
      </div>

      <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-[#0d1117] p-3 text-xs leading-relaxed text-muted">
        {check.output || "No output captured."}
      </pre>

      {check.status === "failed" ? (
        <Button className="mt-3" onClick={() => onCreateFixTask(check)} variant="primary">
          Create Fix Task
        </Button>
      ) : null}
    </Card>
  );
}

function QualityCommandDialog({
  draft,
  mode,
  isSaving,
  onChange,
  onClose,
  onSave
}: {
  draft: QualityCommandInput | null;
  mode: "create" | "edit";
  isSaving: boolean;
  onChange: (draft: QualityCommandInput) => void;
  onClose: () => void;
  onSave: () => void;
}): React.JSX.Element {
  const updateField = (field: keyof QualityCommandInput, value: string | boolean | number | null): void => {
    if (!draft) {
      return;
    }

    onChange({ ...draft, [field]: value });
  };

  return (
    <Dialog
      description="Commands run in the selected project folder. Timeout is enforced in the main process."
      onClose={onClose}
      open={draft !== null}
      title={mode === "edit" ? "Edit Quality Command" : "Add Quality Command"}
    >
      {draft ? (
        <div className="grid gap-4">
          <Input
            label="Label"
            onChange={(event) => updateField("label", event.target.value)}
            value={draft.label}
          />
          <Input
            label="Command"
            onChange={(event) => updateField("command", event.target.value)}
            value={draft.command}
          />
          <Input
            label="Timeout Ms"
            min={1000}
            onChange={(event) => {
              const value = event.target.value.trim();
              updateField("timeoutMs", value ? Number(value) : null);
            }}
            type="number"
            value={draft.timeoutMs ?? ""}
          />
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              checked={draft.required}
              onChange={(event) => updateField("required", event.target.checked)}
              type="checkbox"
            />
            Required
          </label>
          <p className="text-xs text-muted">
            Optional checks that fail are marked skipped and do not fail the overall required run.
          </p>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button onClick={onClose} variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={isSaving || draft.label.trim().length === 0 || draft.command.trim().length === 0}
              onClick={onSave}
              variant="primary"
            >
              {isSaving ? "Saving..." : "Save Command"}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
