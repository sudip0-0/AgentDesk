import { useEffect, useState } from "react";
import type { ProjectSummary } from "../../../shared/projectTypes";
import type { TaskInput, TaskPriority, TaskRecord, TaskStatus } from "../../../shared/taskTypes";
import { taskPriorities, taskStatuses } from "../../../shared/taskTypes";
import { cn } from "../lib/cn";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { Dialog } from "./ui/Dialog";
import { Input } from "./ui/Input";

const statusLabels: Record<TaskStatus, string> = {
  backlog: "Backlog",
  ready: "Ready",
  running: "Running",
  needs_review: "Needs Review",
  failed: "Failed",
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
  doneDefinition: ""
});

interface TaskBoardProps {
  project: ProjectSummary | null;
  onTasksChanged: () => void;
}

export function TaskBoard({ project, onTasksChanged }: TaskBoardProps): React.JSX.Element {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TaskInput | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

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

    if (!project) {
      setTasks([]);
      setSelectedTaskId(null);
      return;
    }

    void loadTasks(project.id);
  }, [project]);

  const openCreateDialog = (): void => {
    if (!project) {
      return;
    }

    setEditingTaskId(null);
    setDraft(emptyTaskInput(project.id));
  };

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
      doneDefinition: task.doneDefinition
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
    setError(null);

    try {
      const updatedTask = await window.agentdesk.tasks.setStatus({ id: taskId, status });
      setTasks((current) => current.map((task) => (task.id === taskId ? updatedTask : task)));
      setSelectedTaskId(taskId);
      onTasksChanged();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Failed to update task status.");
    }
  };

  const deleteSelectedTask = async (): Promise<void> => {
    if (!selectedTask) {
      return;
    }

    const confirmed = window.confirm(`Delete task "${selectedTask.title}"?`);

    if (!confirmed) {
      return;
    }

    setError(null);

    try {
      await window.agentdesk.tasks.delete({ id: selectedTask.id });
      setTasks((current) => current.filter((task) => task.id !== selectedTask.id));
      setSelectedTaskId(null);
      setMessage("Task deleted.");
      onTasksChanged();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete task.");
    }
  };

  if (!project) {
    return (
      <Card className="border-dashed">
        <CardTitle>No project selected</CardTitle>
        <CardDescription>Open a project folder before creating tasks.</CardDescription>
      </Card>
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
          <Card className="border-dashed">
            <CardTitle>Loading tasks</CardTitle>
            <CardDescription>Reading local task records from SQLite.</CardDescription>
          </Card>
        ) : null}

        {!isLoading && tasks.length === 0 ? (
          <Card className="border-dashed">
            <CardTitle>No tasks yet</CardTitle>
            <CardDescription>Create a task contract to populate the board.</CardDescription>
          </Card>
        ) : null}

        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {taskStatuses.map((status) => {
            const columnTasks = tasks.filter((task) => task.status === status);

            return (
              <section
                className="grid min-h-[220px] content-start gap-2 rounded-lg border border-border bg-[#111820] p-3"
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
        onDelete={() => void deleteSelectedTask()}
        onEdit={openEditDialog}
        onStatusChange={(taskId, status) => void changeStatus(taskId, status)}
        task={selectedTask}
      />

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
  onEdit,
  onDelete,
  onStatusChange
}: {
  task: TaskRecord | null;
  onEdit: (task: TaskRecord) => void;
  onDelete: () => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}): React.JSX.Element {
  if (!task) {
    return (
      <Card className="border-dashed">
        <CardTitle>Task Detail</CardTitle>
        <CardDescription>Select a card to inspect its contract.</CardDescription>
      </Card>
    );
  }

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
            className="rounded-md border border-border bg-[#10161d] px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
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
          <Button onClick={() => onEdit(task)} variant="primary">
            Edit
          </Button>
          <Button onClick={onDelete} variant="danger">
            Delete
          </Button>
        </div>
      </Card>

      <TaskContractSection label="Goal" value={task.goal} />
      <TaskContractSection label="Acceptance Criteria" value={task.acceptanceCriteria} />
      <TaskContractSection label="Quality Commands" preserveLines value={task.qualityCommands} />
      <TaskContractSection label="Security Notes" value={task.securityNotes} />
      <TaskContractSection label="Done Definition" value={task.doneDefinition} />
      <TaskContractSection label="Context" value={task.context} />
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
        className="rounded-md border border-border bg-[#10161d] px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
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
        className="min-h-24 w-full resize-y rounded-md border border-border bg-[#10161d] px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}
