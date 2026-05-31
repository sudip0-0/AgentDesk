import { useCallback, useEffect, useState } from "react";
import type {
  QualityCheckRecord,
  QualityCommandInput,
  QualityCommandRecord,
  QualityRunContext
} from "../../../shared/qualityTypes";
import { classifyCommand } from "../../../shared/commandSafety";
import type { ProjectSummary } from "../../../shared/projectTypes";
import type { QualityActionRequestType, UiActionRequest } from "../../../shared/uiActionTypes";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { Dialog } from "./ui/Dialog";
import { EmptyState } from "./ui/EmptyState";
import { Input } from "./ui/Input";
import { StatusBadge } from "./ui/StatusBadge";
import { pushToast } from "../lib/toast";
import { cn } from "../lib/cn";

const emptyCommand = (projectId: string): QualityCommandInput => ({
  projectId,
  label: "",
  command: "",
  required: true,
  timeoutMs: 120_000
});

const summarizeRunResults = (results: QualityCheckRecord[]): string => {
  const requiredFailures = results.filter((result) => result.status === "failed").length;
  const blocked = results.filter((result) => result.status === "blocked").length;
  const skippedOptional = results.filter((result) => result.status === "skipped").length;

  if (blocked > 0) {
    return `${blocked} command(s) blocked for safety${
      requiredFailures > 0 ? `, ${requiredFailures} required check(s) failed.` : "."
    }`;
  }

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
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [runConfirmOpen, setRunConfirmOpen] = useState(false);
  const [deleteConfirmCommand, setDeleteConfirmCommand] = useState<QualityCommandRecord | null>(null);

  const selectedCheck = checks.find((check) => check.id === selectedCheckId) ?? checks[0] ?? null;

  const loadQualityData = useCallback(async (projectId: string): Promise<void> => {
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
      pushToast(loadError instanceof Error ? loadError.message : "Failed to load quality data.", "error");
    }
  }, [runContext?.agentRunId, runContext?.taskId]);

  useEffect(() => {
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
      pushToast("Add a quality command before running checks.", "info");
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

    try {
      if (editingId) {
        await window.agentdesk.quality.updateCommand({ ...draft, id: editingId });
        pushToast("Quality command updated.", "success");
      } else {
        await window.agentdesk.quality.createCommand(draft);
        pushToast("Quality command added.", "success");
      }

      setDraft(null);
      setEditingId(null);
      await loadQualityData(project.id);
    } catch (saveError) {
      pushToast(saveError instanceof Error ? saveError.message : "Failed to save quality command.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteCommand = async (): Promise<void> => {
    if (!project || !deleteConfirmCommand) {
      return;
    }

    try {
      await window.agentdesk.quality.deleteCommand({
        projectId: project.id,
        id: deleteConfirmCommand.id
      });
      pushToast("Quality command deleted.", "success");
      setDeleteConfirmCommand(null);
      await loadQualityData(project.id);
    } catch (deleteError) {
      pushToast(deleteError instanceof Error ? deleteError.message : "Failed to delete quality command.", "error");
    }
  };

  const executeRun = async (): Promise<void> => {
    if (!project) {
      return;
    }

    setIsRunning(true);
    setRunConfirmOpen(false);

    try {
      const results = await window.agentdesk.quality.run({
        projectId: project.id,
        taskId: runContext?.taskId ?? undefined,
        agentRunId: runContext?.agentRunId ?? undefined
      });
      setChecks(results);
      setSelectedCheckId(results[0]?.id ?? null);
      const hasFailure = results.some(
        (result: QualityCheckRecord) => result.status === "failed" || result.status === "blocked"
      );
      pushToast(summarizeRunResults(results), hasFailure ? "error" : "success");
    } catch (runError) {
      pushToast(runError instanceof Error ? runError.message : "Failed to run quality checks.", "error");
    } finally {
      setIsRunning(false);
    }
  };

  const createFixTask = async (check: QualityCheckRecord): Promise<void> => {
    if (!project) {
      return;
    }

    try {
      await window.agentdesk.quality.createFixTask({
        projectId: project.id,
        qualityCheckId: check.id
      });
      pushToast("Fix task created.", "success");
      onFixTaskCreated();
    } catch (fixError) {
      pushToast(fixError instanceof Error ? fixError.message : "Failed to create fix task.", "error");
    }
  };

  if (!project) {
    return (
      <EmptyState
        description="Open a project before configuring quality checks."
        title="No project selected"
      />
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
          <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent-soft">
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

        <Button
          disabled={isRunning || commands.length === 0}
          onClick={() => setRunConfirmOpen(true)}
          variant="primary"
        >
          {isRunning ? "Running..." : "Run All Checks"}
        </Button>

        {commands.map((command) => {
          const risk = classifyCommand(command.command);

          return (
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
              {risk.level !== "safe" ? (
                <p
                  className={cn(
                    "mt-2 rounded-md border px-2 py-1 text-xs",
                    risk.level === "block"
                      ? "border-danger/45 bg-danger/10 text-danger-soft"
                      : "border-accent-strong/45 bg-accent-strong/10 text-warning-soft"
                  )}
                >
                  {risk.level === "block" ? "Blocked: " : "Warning: "}
                  {risk.reasons.join(" ")}
                </p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <Button onClick={() => openEdit(command)} size="sm" variant="secondary">
                  Edit
                </Button>
                <Button onClick={() => setDeleteConfirmCommand(command)} size="sm" variant="danger">
                  Delete
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <section className="grid content-start gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Recent Results</h2>

        {checks.length === 0 ? (
          <EmptyState
            description="Run checks to capture stdout, stderr, exit code, and timing."
            title="No quality results"
          />
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
                  <StatusBadge status={check.status} />
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
          {commands.map((command) => {
            const risk = classifyCommand(command.command);

            return (
              <li className="rounded-md border border-border bg-code px-3 py-2" key={command.id}>
                <span className="font-bold text-text">{command.label}</span>
                <span className="mt-1 block break-all">{command.command}</span>
                <span className="mt-1 block text-xs">
                  {command.required ? "Required" : "Optional"}
                  {command.timeoutMs ? ` · timeout ${command.timeoutMs}ms` : ""}
                </span>
                {risk.level !== "safe" ? (
                  <span
                    className={cn(
                      "mt-1 block text-xs font-bold",
                      risk.level === "block" ? "text-danger-soft" : "text-warning-soft"
                    )}
                  >
                    {risk.level === "block"
                      ? "Will be blocked and not run for safety."
                      : "Warning: review before running."}
                  </span>
                ) : null}
              </li>
            );
          })}
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
      <EmptyState description="Select a quality result." title="Result Detail" />
    );
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{check.label}</CardTitle>
          <CardDescription className="break-all">{check.command}</CardDescription>
        </div>
        <StatusBadge status={check.status} />
      </div>

      <div className="mt-3 grid gap-2 text-xs text-muted">
        <span>Exit code: {check.exitCode ?? "none"}</span>
        <span>Started: {check.startedAt}</span>
        <span>Finished: {check.finishedAt ?? "not finished"}</span>
        <span>Task: {check.taskId ?? "none"} · Run: {check.agentRunId ?? "none"}</span>
      </div>

      <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-code p-3 text-xs leading-relaxed text-muted">
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
