import { useEffect, useState } from "react";
import { buildAgentLaunchConfig } from "../../../shared/agentCommandBuilder";
import type { AgentProfileRecord } from "../../../shared/agentProfileTypes";
import {
  buildPrompt,
  createPromptContext,
  promptTemplates,
  type PromptTemplateId
} from "../../../shared/promptEngine";
import { shouldConfirmPromptSend } from "../../../shared/promptDelivery";
import type { PromptSendRequest } from "../../../shared/promptSendTypes";
import type { ProjectSummary } from "../../../shared/projectTypes";
import type { TaskInput, TaskPriority, TaskRecord, TaskStatus } from "../../../shared/taskTypes";
import { taskPriorities, taskStatuses } from "../../../shared/taskTypes";
import type { TaskActionRequestType, UiActionRequest } from "../../../shared/uiActionTypes";
import { useAppSettings } from "../hooks/useAppSettings";
import { cn } from "../lib/cn";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { EmptyState } from "./ui/EmptyState";
import { Dialog } from "./ui/Dialog";
import { Input } from "./ui/Input";

const statusLabels: Record<TaskStatus, string> = {
  backlog: "Backlog",
  ready: "Ready",
  running: "Running",
  needs_review: "Needs Review",
  failed: "Failed",
  blocked: "Blocked",
  done: "Done"
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High"
};

const emptyTaskInput = (projectId: string): TaskInput => ({
  projectId,
  title: "",
  description: "",
  status: "backlog",
  priority: "medium",
  goal: "",
  context: "",
  acceptanceCriteria: "",
  filesLikelyAffected: "",
  qualityCommands: "npm run lint\nnpm run typecheck\nnpm test\nnpm run build",
  securityNotes: "",
  doneDefinition: "",
  dependsOn: ""
});

interface TaskBoardProps {
  project: ProjectSummary | null;
  onTasksChanged: () => void;
  onLaunchInTerminal: (task: TaskRecord, agentProfile?: AgentProfileRecord) => void;
  onRunQualityChecks: (task: TaskRecord) => void;
  onSyncProgress: () => void;
  onSendPromptToTerminal: (request: PromptSendRequest) => void;
  actionRequest?: UiActionRequest<TaskActionRequestType> | null;
  onActionHandled?: () => void;
}

export function TaskBoard({
  project,
  onTasksChanged,
  onLaunchInTerminal,
  onRunQualityChecks,
  onSyncProgress,
  onSendPromptToTerminal,
  actionRequest,
  onActionHandled
}: TaskBoardProps): React.JSX.Element {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskInput | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<PromptTemplateId>("implementation");
  const [fixContext, setFixContext] = useState("");
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [agentProfiles, setAgentProfiles] = useState<AgentProfileRecord[]>([]);
  const [selectedAgentProfileId, setSelectedAgentProfileId] = useState("");
  const [pendingSend, setPendingSend] = useState<{
    task: TaskRecord;
    templateId: PromptTemplateId;
    prompt: string;
    label: string;
  } | null>(null);
  const [launchConfirmOpen, setLaunchConfirmOpen] = useState(false);
  const [pendingLaunch, setPendingLaunch] = useState<{
    task: TaskRecord;
    profile: AgentProfileRecord;
    displayCommand: string;
    promptDelivery: string;
  } | null>(null);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const settings = useAppSettings();

  // Launch directly when approval is disabled; otherwise open the confirm dialog.
  const beginLaunch = (
    task: TaskRecord,
    profile: AgentProfileRecord,
    launchConfig: { displayCommand: string; promptDelivery: string }
  ): void => {
    if (!settings.requireAgentLaunchApproval) {
      onLaunchInTerminal(task, profile);
      return;
    }

    setPendingLaunch({
      task,
      profile,
      displayCommand: launchConfig.displayCommand,
      promptDelivery: launchConfig.promptDelivery
    });
    setLaunchConfirmOpen(true);
  };

  const buildTaskPrompt = (task: TaskRecord, templateId: PromptTemplateId): string => {
    if (!project) {
      return "";
    }

    return buildPrompt(
      templateId,
      createPromptContext(project, task, {
        fixContext: templateId === "fix" ? fixContext : undefined
      })
    );
  };

  const requestSendPrompt = (task: TaskRecord, templateId: PromptTemplateId): void => {
    const prompt = buildTaskPrompt(task, templateId);
    const templateLabel = promptTemplates.find((template) => template.id === templateId)?.label ?? "Prompt";
    const label = `${templateLabel} prompt`;

    if (shouldConfirmPromptSend(prompt)) {
      setPendingSend({ task, templateId, prompt, label });
      setSendConfirmOpen(true);
      return;
    }

    onSendPromptToTerminal({
      id: crypto.randomUUID(),
      prompt,
      label
    });
  };

  const loadTasks = async (projectId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedTasks: TaskRecord[] = await window.agentdesk.tasks.list(projectId);
      setTasks(loadedTasks);
      setSelectedTaskId((current) =>
        current && loadedTasks.some((task) => task.id === current) ? current : loadedTasks[0]?.id ?? null
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load tasks.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMessage(null);
    setError(null);
    setEditingTaskId(null);
    setDraft(null);
    setFixContext("");

    if (!project) {
      setTasks([]);
      setSelectedTaskId(null);
      return;
    }

    void loadTasks(project.id);
  }, [project]);

  useEffect(() => {
    let cancelled = false;

    void window.agentdesk.agentProfiles
      .list()
      .then((profiles: AgentProfileRecord[]) => {
        if (cancelled) {
          return;
        }

        setAgentProfiles(profiles);
        setSelectedAgentProfileId((current) => current || profiles[0]?.id || "");
      })
      .catch(() => {
        if (!cancelled) {
          setAgentProfiles([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setFixContext("");
  }, [selectedTaskId]);

  const openCreateDialog = (): void => {
    if (!project) {
      return;
    }

    setEditingTaskId(null);
    setDraft(emptyTaskInput(project.id));
  };

  const requestLaunchSelected = (): void => {
    if (!project || !selectedTask) {
      setMessage("Select a task before launching an agent.");
      return;
    }

    const profile =
      agentProfiles.find((entry) => entry.id === selectedAgentProfileId) ?? agentProfiles[0] ?? null;

    if (!profile) {
      setMessage("Add an agent profile before launching.");
      return;
    }

    const prompt = buildTaskPrompt(selectedTask, "implementation");
    const launchConfig = buildAgentLaunchConfig(profile, {
      project,
      task: selectedTask,
      prompt,
      cwd: project.path
    });

    beginLaunch(selectedTask, profile, launchConfig);
  };

  useEffect(() => {
    if (!actionRequest) {
      return;
    }

    if (actionRequest.type === "create") {
      openCreateDialog();
    } else if (actionRequest.type === "launch-selected") {
      requestLaunchSelected();
    } else if (actionRequest.type === "run-checks-selected") {
      if (selectedTask) {
        onRunQualityChecks(selectedTask);
      } else {
        setMessage("Select a task before running checks.");
      }
    }

    onActionHandled?.();
    // Only react to dispatched palette/shortcut requests, not every task-board state change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- openCreateDialog and requestLaunchSelected are intentionally omitted
  }, [actionRequest, onActionHandled, onRunQualityChecks, selectedTask]);

  const openEditDialog = (task: TaskRecord): void => {
    setEditingTaskId(task.id);
    setDraft({
      projectId: task.projectId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      goal: task.goal,
      context: task.context,
      acceptanceCriteria: task.acceptanceCriteria,
      filesLikelyAffected: task.filesLikelyAffected,
      qualityCommands: task.qualityCommands,
      securityNotes: task.securityNotes,
      doneDefinition: task.doneDefinition,
      dependsOn: task.dependsOn
    });
    setSelectedTaskId(task.id);
  };

  const closeDialog = (): void => {
    setDraft(null);
    setEditingTaskId(null);
  };

  const saveDraft = async (): Promise<void> => {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const savedTask = editingTaskId
        ? await window.agentdesk.tasks.update({ ...draft, id: editingTaskId })
        : await window.agentdesk.tasks.create(draft);

      setTasks((current) => {
        const exists = current.some((task) => task.id === savedTask.id);
        const next = exists
          ? current.map((task) => (task.id === savedTask.id ? savedTask : task))
          : [...current, savedTask];

        return next.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      });
      setSelectedTaskId(savedTask.id);
      closeDialog();
      setMessage(editingTaskId ? "Task updated." : "Task created.");
      onTasksChanged();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save task.");
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = async (taskId: string, status: TaskStatus): Promise<void> => {
    if (!project) {
      return;
    }

    setError(null);

    try {
      const updatedTask = await window.agentdesk.tasks.setStatus({
        projectId: project.id,
        id: taskId,
        status
      });
      setTasks((current) => current.map((task) => (task.id === taskId ? updatedTask : task)));
      setSelectedTaskId(taskId);
      setMessage("Task status updated. Sync PROGRESS.md when you are ready to record progress.");
      onTasksChanged();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to update task status.");
    }
  };

  const deleteSelectedTask = async (): Promise<void> => {
    if (!project || !selectedTask) {
      return;
    }

    setError(null);

    try {
      await window.agentdesk.tasks.delete({ projectId: project.id, id: selectedTask.id });
      setTasks((current) => current.filter((task) => task.id !== selectedTask.id));
      setSelectedTaskId(null);
      setDeleteConfirmOpen(false);
      setMessage("Task deleted.");
      onTasksChanged();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete task.");
    }
  };

  if (!project) {
    return (
      <EmptyState
        description="Open a project folder before creating tasks."
        title="No project selected"
      />
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Task Board</h2>
            <p className="mt-1 text-sm text-muted">Local tasks for {project.name}</p>
          </div>
          <Button onClick={openCreateDialog} variant="primary">
            New Task
          </Button>
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

        {isLoading ? (
          <EmptyState description="Reading local task records from SQLite." title="Loading tasks" />
        ) : null}

        {!isLoading && tasks.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={openCreateDialog} variant="primary">
                Create Task
              </Button>
            }
            description="Create a task and assign it to a coding agent."
            title="No tasks yet"
          />
        ) : null}

        <div className="flex gap-3 overflow-x-auto pb-2">
          {taskStatuses.map((status) => {
            const columnTasks = tasks.filter((task) => task.status === status);

            return (
              <section
                className="grid min-h-[220px] w-72 shrink-0 content-start gap-2 rounded-lg border border-border bg-elevated p-3"
                key={status}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-text">{statusLabels[status]}</h3>
                  <Badge>{columnTasks.length}</Badge>
                </div>

                {columnTasks.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted">
                    No {statusLabels[status].toLowerCase()} tasks.
                  </div>
                ) : null}

                {columnTasks.map((task) => (
                  <button
                    className={cn(
                      "grid gap-2 rounded-md border bg-panel p-3 text-left transition hover:bg-panel-strong",
                      task.id === selectedTaskId ? "border-accent/60" : "border-border"
                    )}
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    type="button"
                  >
                    <span className="text-sm font-bold text-text">{task.title}</span>
                    <span className="line-clamp-2 text-xs leading-relaxed text-muted">
                      {task.goal || task.description || "No goal or description provided."}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={task.priority === "high" ? "warning" : "default"}>
                        {priorityLabels[task.priority]}
                      </Badge>
                    </div>
                  </button>
                ))}
              </section>
            );
          })}
        </div>
      </div>

      <TaskDetailPanel
        fixContext={fixContext}
        onCopyPrompt={async (task, templateId) => {
          if (!project) {
            return;
          }

          try {
            const prompt = buildTaskPrompt(task, templateId);
            const templateLabel = promptTemplates.find((template) => template.id === templateId)?.label ?? "Prompt";
            await navigator.clipboard.writeText(prompt);
            setMessage(`${templateLabel} prompt copied.`);
          } catch {
            setError("Failed to copy the prompt.");
          }
        }}
        onDelete={() => setDeleteConfirmOpen(true)}
        onEdit={openEditDialog}
        onFixContextChange={setFixContext}
        agentProfiles={agentProfiles}
        onRunQualityChecks={onRunQualityChecks}
        onSyncProgress={onSyncProgress}
        onLaunchInTerminal={(task, profile) => {
          if (!profile || !project) {
            onLaunchInTerminal(task);
            return;
          }

          const prompt = buildTaskPrompt(task, "implementation");
          const launchConfig = buildAgentLaunchConfig(profile, {
            project,
            task,
            prompt,
            cwd: project.path
          });

          beginLaunch(task, profile, launchConfig);
        }}
        onSendPromptToTerminal={requestSendPrompt}
        onStatusChange={(taskId, status) => void changeStatus(taskId, status)}
        project={project}
        selectedAgentProfileId={selectedAgentProfileId}
        selectedTemplateId={selectedTemplateId}
        setSelectedAgentProfileId={setSelectedAgentProfileId}
        setSelectedTemplateId={setSelectedTemplateId}
        task={selectedTask}
      />

      <Dialog
        description="This starts a local terminal session with the command below. Only continue if you trust the profile configuration."
        onClose={() => {
          setLaunchConfirmOpen(false);
          setPendingLaunch(null);
        }}
        open={launchConfirmOpen && pendingLaunch !== null}
        title={pendingLaunch ? `Launch ${pendingLaunch.profile.name}?` : "Launch agent"}
      >
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-code p-3 text-xs leading-relaxed text-muted">
          {pendingLaunch?.displayCommand}
        </pre>
        {pendingLaunch ? (
          <p className="mt-3 text-sm text-muted">
            Prompt delivery: {pendingLaunch.promptDelivery}. The task will be marked Running and linked to
            this session.
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
          <Button
            onClick={() => {
              setLaunchConfirmOpen(false);
              setPendingLaunch(null);
            }}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!pendingLaunch) {
                return;
              }

              onLaunchInTerminal(pendingLaunch.task, pendingLaunch.profile);
              setLaunchConfirmOpen(false);
              setPendingLaunch(null);
            }}
            variant="primary"
          >
            Launch Agent
          </Button>
        </div>
      </Dialog>

      <Dialog
        description="Long prompts are copied to the clipboard and written to the active terminal line by line. Review before confirming."
        onClose={() => {
          setSendConfirmOpen(false);
          setPendingSend(null);
        }}
        open={sendConfirmOpen && pendingSend !== null}
        title="Send prompt to terminal?"
      >
        <p className="text-sm leading-relaxed text-muted">
          This prompt is {pendingSend?.prompt.length.toLocaleString() ?? 0} characters. It will be copied
          to the clipboard and sent to the active terminal session.
        </p>
        <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
          <Button
            onClick={() => {
              setSendConfirmOpen(false);
              setPendingSend(null);
            }}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!pendingSend) {
                return;
              }

              onSendPromptToTerminal({
                id: crypto.randomUUID(),
                prompt: pendingSend.prompt,
                label: pendingSend.label
              });
              setSendConfirmOpen(false);
              setPendingSend(null);
            }}
            variant="primary"
          >
            Send Prompt
          </Button>
        </div>
      </Dialog>

      <Dialog
        description="This removes the task from the local board. Linked run history is kept, but the task reference is cleared."
        onClose={() => setDeleteConfirmOpen(false)}
        open={deleteConfirmOpen && selectedTask !== null}
        title={selectedTask ? `Delete "${selectedTask.title}"?` : "Delete task"}
      >
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button onClick={() => setDeleteConfirmOpen(false)} variant="ghost">
            Cancel
          </Button>
          <Button onClick={() => void deleteSelectedTask()} variant="danger">
            Delete Task
          </Button>
        </div>
      </Dialog>

      <TaskDialog
        draft={draft}
        isSaving={isSaving}
        mode={editingTaskId ? "edit" : "create"}
        onChange={setDraft}
        onClose={closeDialog}
        onSave={() => void saveDraft()}
      />
    </section>
  );
}

function TaskDetailPanel({
  task,
  project,
  onEdit,
  onDelete,
  fixContext,
  agentProfiles,
  onCopyPrompt,
  onFixContextChange,
  onLaunchInTerminal,
  onRunQualityChecks,
  onSyncProgress,
  onSendPromptToTerminal,
  onStatusChange,
  selectedAgentProfileId,
  selectedTemplateId,
  setSelectedAgentProfileId,
  setSelectedTemplateId
}: {
  task: TaskRecord | null;
  project: ProjectSummary;
  fixContext: string;
  agentProfiles: AgentProfileRecord[];
  onEdit: (task: TaskRecord) => void;
  onDelete: () => void;
  onCopyPrompt: (task: TaskRecord, templateId: PromptTemplateId) => void;
  onFixContextChange: (value: string) => void;
  onLaunchInTerminal: (task: TaskRecord, profile?: AgentProfileRecord) => void;
  onRunQualityChecks: (task: TaskRecord) => void;
  onSyncProgress: () => void;
  onSendPromptToTerminal: (task: TaskRecord, templateId: PromptTemplateId) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  selectedAgentProfileId: string;
  selectedTemplateId: PromptTemplateId;
  setSelectedAgentProfileId: (profileId: string) => void;
  setSelectedTemplateId: (templateId: PromptTemplateId) => void;
}): React.JSX.Element {
  if (!task) {
    return (
      <EmptyState description="Select a card to inspect its contract." title="Task Detail" />
    );
  }

  const selectedTemplate =
    promptTemplates.find((template) => template.id === selectedTemplateId) ?? promptTemplates[0];
  const promptPreview = buildPrompt(
    selectedTemplateId,
    createPromptContext(project, task, {
      fixContext: selectedTemplateId === "fix" ? fixContext : undefined
    })
  );
  const selectedAgentProfile =
    agentProfiles.find((profile) => profile.id === selectedAgentProfileId) ?? agentProfiles[0] ?? null;
  const commandPreview =
    selectedAgentProfile
      ? buildAgentLaunchConfig(selectedAgentProfile, {
          project,
          task,
          prompt: buildPrompt("implementation", createPromptContext(project, task)),
          cwd: project.path
        })
      : null;

  return (
    <aside className="grid content-start gap-3">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{task.title}</CardTitle>
            <CardDescription>{task.description || "No description provided."}</CardDescription>
          </div>
          <Badge variant={task.status === "done" ? "success" : "default"}>{statusLabels[task.status]}</Badge>
        </div>

        <label className="mt-4 grid gap-1.5">
          <span className="text-xs font-bold text-muted">Status</span>
          <select
            className="rounded-md border border-border bg-inset px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
            onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}
            value={task.status}
          >
            {taskStatuses.map((status) => (
              <option key={status} value={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={agentProfiles.length === 0}
            onClick={() => onLaunchInTerminal(task, selectedAgentProfile ?? undefined)}
            variant="primary"
          >
            Launch Agent
          </Button>
          <Button onClick={() => onRunQualityChecks(task)} variant="secondary">
            Run Quality Checks
          </Button>
          <Button onClick={onSyncProgress} variant="secondary">
            Sync PROGRESS.md
          </Button>
          <Button onClick={() => onEdit(task)} variant="secondary">
            Edit
          </Button>
          <Button onClick={onDelete} variant="danger">
            Delete
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Launch Agent links this task to the session, sets status to Running, and stores the
          implementation prompt for {project.name}.
        </p>
      </Card>

      <Card>
        <CardTitle>Agent Launch</CardTitle>
        <CardDescription>Select a profile and confirm the command before launching.</CardDescription>
        <label className="mt-4 grid gap-1.5">
          <span className="text-xs font-bold text-muted">Agent Profile</span>
          <select
            className="rounded-md border border-border bg-inset px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
            onChange={(event) => setSelectedAgentProfileId(event.target.value)}
            value={selectedAgentProfile?.id ?? ""}
          >
            {agentProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </label>
        <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-code p-3 text-xs leading-relaxed text-muted">
          {commandPreview?.displayCommand ?? "No agent profiles configured."}
        </pre>
        {commandPreview ? (
          <p className="mt-2 text-xs text-muted">
            Working directory: {commandPreview.cwd}. Prompt delivery: {commandPreview.promptDelivery}.
          </p>
        ) : null}
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Prompt Preview</CardTitle>
            <CardDescription>{selectedTemplate.description}</CardDescription>
          </div>
          <Badge>{selectedTemplate.label}</Badge>
        </div>

        <label className="mt-4 grid gap-1.5">
          <span className="text-xs font-bold text-muted">Prompt Template</span>
          <select
            className="rounded-md border border-border bg-inset px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
            onChange={(event) => setSelectedTemplateId(event.target.value as PromptTemplateId)}
            value={selectedTemplateId}
          >
            {promptTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label}
              </option>
            ))}
          </select>
        </label>

        {selectedTemplateId === "fix" ? (
          <label className="mt-3 grid gap-1.5">
            <span className="text-xs font-bold text-muted">Fix Context</span>
            <textarea
              className="min-h-28 w-full resize-y rounded-md border border-border bg-inset px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
              onChange={(event) => onFixContextChange(event.target.value)}
              placeholder="Paste failed lint/typecheck/test output or review findings..."
              value={fixContext}
            />
          </label>
        ) : null}

        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-code p-3 text-xs leading-relaxed text-muted">
          {promptPreview}
        </pre>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => void onCopyPrompt(task, selectedTemplateId)} variant="primary">
            Copy Prompt
          </Button>
          <Button onClick={() => onSendPromptToTerminal(task, selectedTemplateId)} variant="secondary">
            Send to Active Terminal
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted">
          Send copies the prompt to the clipboard and writes it line by line into the active terminal.
          Prompts over 500 characters require confirmation.
        </p>
      </Card>

      <TaskContractSection label="Goal" value={task.goal} />
      <TaskContractSection label="Acceptance Criteria" value={task.acceptanceCriteria} />
      <TaskContractSection label="Quality Commands" preserveLines value={task.qualityCommands} />
      <TaskContractSection label="Security Notes" value={task.securityNotes} />
      <TaskContractSection label="Done Definition" value={task.doneDefinition} />
      <TaskContractSection label="Context" value={task.context} />
      <TaskContractSection label="Dependencies" preserveLines value={task.dependsOn} />
      <TaskContractSection label="Files Likely Affected" preserveLines value={task.filesLikelyAffected} />
    </aside>
  );
}

function TaskContractSection({
  label,
  value,
  preserveLines = false
}: {
  label: string;
  value: string;
  preserveLines?: boolean;
}): React.JSX.Element {
  return (
    <Card>
      <CardTitle className="text-sm">{label}</CardTitle>
      <p className={cn("mt-2 text-sm leading-relaxed text-muted", preserveLines ? "whitespace-pre-wrap" : "")}>
        {value || "Not specified."}
      </p>
    </Card>
  );
}

function TaskDialog({
  draft,
  mode,
  isSaving,
  onChange,
  onClose,
  onSave
}: {
  draft: TaskInput | null;
  mode: "create" | "edit";
  isSaving: boolean;
  onChange: (draft: TaskInput) => void;
  onClose: () => void;
  onSave: () => void;
}): React.JSX.Element {
  const updateField = (field: keyof TaskInput, value: string): void => {
    if (!draft) {
      return;
    }

    onChange({ ...draft, [field]: value });
  };

  return (
    <Dialog
      description="Keep the task contract specific enough for an implementation agent to execute."
      onClose={onClose}
      open={draft !== null}
      title={mode === "edit" ? "Edit Task" : "Create Task"}
    >
      {draft ? (
        <div className="grid gap-4">
          <Input
            label="Title"
            onChange={(event) => updateField("title", event.target.value)}
            value={draft.title}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <SelectField
              label="Status"
              onChange={(value) => updateField("status", value)}
              options={taskStatuses.map((status) => ({ label: statusLabels[status], value: status }))}
              value={draft.status}
            />
            <SelectField
              label="Priority"
              onChange={(value) => updateField("priority", value)}
              options={taskPriorities.map((priority) => ({
                label: priorityLabels[priority],
                value: priority
              }))}
              value={draft.priority}
            />
          </div>

          <TextArea
            label="Description"
            onChange={(value) => updateField("description", value)}
            value={draft.description}
          />
          <TextArea label="Goal" onChange={(value) => updateField("goal", value)} value={draft.goal} />
          <TextArea
            label="Acceptance Criteria"
            onChange={(value) => updateField("acceptanceCriteria", value)}
            value={draft.acceptanceCriteria}
          />
          <TextArea
            label="Quality Commands"
            onChange={(value) => updateField("qualityCommands", value)}
            value={draft.qualityCommands}
          />
          <TextArea
            label="Security Notes"
            onChange={(value) => updateField("securityNotes", value)}
            value={draft.securityNotes}
          />
          <TextArea
            label="Done Definition"
            onChange={(value) => updateField("doneDefinition", value)}
            value={draft.doneDefinition}
          />
          <TextArea label="Context" onChange={(value) => updateField("context", value)} value={draft.context} />
          <TextArea
            label="Dependencies"
            onChange={(value) => updateField("dependsOn", value)}
            value={draft.dependsOn}
          />
          <TextArea
            label="Files Likely Affected"
            onChange={(value) => updateField("filesLikelyAffected", value)}
            value={draft.filesLikelyAffected}
          />

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button onClick={onClose} variant="ghost">
              Cancel
            </Button>
            <Button disabled={isSaving || draft.title.trim().length === 0} onClick={onSave} variant="primary">
              {isSaving ? "Saving..." : "Save Task"}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold text-muted">{label}</span>
      <select
        className="rounded-md border border-border bg-inset px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-bold text-muted">{label}</span>
      <textarea
        className="min-h-24 w-full resize-y rounded-md border border-border bg-inset px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}
