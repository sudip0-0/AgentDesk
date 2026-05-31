import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProjectSummary } from "../../../shared/projectTypes";
import type { QualityCheckRecord } from "../../../shared/qualityTypes";
import type { AgentRunListItem } from "../../../shared/runDetailTypes";
import type { TaskRecord } from "../../../shared/taskTypes";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { EmptyState } from "./ui/EmptyState";
import { PageHeader } from "./ui/PageHeader";
import { StatusBadge } from "./ui/StatusBadge";
import { pushToast } from "../lib/toast";

const formatDuration = (ms: number | null): string => {
  if (ms === null) {
    return "—";
  }

  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
};

interface AgentGroup {
  agentName: string;
  runs: AgentRunListItem[];
}

interface QualityCounts {
  passed: number;
  failed: number;
  total: number;
}

export function AgentComparisonPanel({
  project,
  onOpenRun
}: {
  project: ProjectSummary | null;
  onOpenRun: (runId: string) => void;
}): React.JSX.Element {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [runs, setRuns] = useState<AgentRunListItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [qualityByRun, setQualityByRun] = useState<Record<string, QualityCounts>>({});
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async (projectId: string): Promise<void> => {
    setIsLoading(true);

    try {
      const [loadedTasks, loadedRuns] = await Promise.all([
        window.agentdesk.tasks.list(projectId),
        window.agentdesk.runs.list(projectId)
      ]);
      setTasks(loadedTasks);
      setRuns(loadedRuns);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "Failed to load comparison data.", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!project) {
      setTasks([]);
      setRuns([]);
      setSelectedTaskId("");
      return;
    }

    void load(project.id);
  }, [load, project]);

  // Default to the task with the most runs across agents (most interesting to compare).
  const tasksWithRuns = useMemo(() => {
    const counts = new Map<string, number>();

    for (const run of runs) {
      if (run.taskId) {
        counts.set(run.taskId, (counts.get(run.taskId) ?? 0) + 1);
      }
    }

    return tasks
      .map((task) => ({ task, runCount: counts.get(task.id) ?? 0 }))
      .sort((left, right) => right.runCount - left.runCount);
  }, [runs, tasks]);

  useEffect(() => {
    if (selectedTaskId || tasksWithRuns.length === 0) {
      return;
    }

    const firstWithRuns = tasksWithRuns.find((entry) => entry.runCount > 0) ?? tasksWithRuns[0];

    if (firstWithRuns) {
      setSelectedTaskId(firstWithRuns.task.id);
    }
  }, [selectedTaskId, tasksWithRuns]);

  const groups = useMemo<AgentGroup[]>(() => {
    const taskRuns = runs.filter((run) => run.taskId === selectedTaskId);
    const byAgent = new Map<string, AgentRunListItem[]>();

    for (const run of taskRuns) {
      const key = run.agentName ?? "Unknown agent";
      const existing = byAgent.get(key) ?? [];
      existing.push(run);
      byAgent.set(key, existing);
    }

    return [...byAgent.entries()].map(([agentName, agentRuns]) => ({ agentName, runs: agentRuns }));
  }, [runs, selectedTaskId]);

  // Per-run quality pass/fail counts (accurate, linked by agentRunId). Reuses existing IPC.
  useEffect(() => {
    if (!project || !selectedTaskId) {
      setQualityByRun({});
      return;
    }

    const taskRuns = runs.filter((run) => run.taskId === selectedTaskId);

    if (taskRuns.length === 0) {
      setQualityByRun({});
      return;
    }

    let cancelled = false;

    void Promise.all(
      taskRuns.map(async (run): Promise<readonly [string, QualityCounts]> => {
        try {
          const checks = await window.agentdesk.quality.listChecks({
            projectId: project.id,
            agentRunId: run.id
          });
          const passed = checks.filter((check: QualityCheckRecord) => check.status === "passed").length;
          const failed = checks.filter(
            (check: QualityCheckRecord) => check.status === "failed" || check.status === "blocked"
          ).length;

          return [run.id, { passed, failed, total: checks.length }] as const;
        } catch {
          return [run.id, { passed: 0, failed: 0, total: 0 }] as const;
        }
      })
    ).then((entries) => {
      if (!cancelled) {
        setQualityByRun(Object.fromEntries(entries));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [project, runs, selectedTaskId]);

  if (!project) {
    return <EmptyState description="Open a project to compare agent runs." title="No project selected" />;
  }

  return (
    <section className="grid content-start gap-4">
      <PageHeader
        subtitle="Run the same task with different agent profiles, then compare results side by side."
        title="Agent Comparison"
      />

      <Card>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-muted">Task</span>
          <select
            className="w-full rounded-md border border-border bg-inset px-2.5 py-2 text-sm text-text outline-none focus:border-accent/60"
            onChange={(event) => setSelectedTaskId(event.target.value)}
            value={selectedTaskId}
          >
            <option value="">Select a task</option>
            {tasksWithRuns.map(({ task, runCount }) => (
              <option key={task.id} value={task.id}>
                {task.title} ({runCount} run{runCount === 1 ? "" : "s"})
              </option>
            ))}
          </select>
        </label>
        <CardDescription className="mt-2">
          Launch this task with multiple agent profiles from the Tasks screen, then return here to compare.
        </CardDescription>
      </Card>

      {isLoading ? (
        <EmptyState description="Reading run history from SQLite." title="Loading runs" />
      ) : !selectedTaskId ? (
        <EmptyState description="Select a task above to compare its agent runs." title="No task selected" />
      ) : groups.length === 0 ? (
        <EmptyState
          description="No runs recorded for this task yet. Launch it with one or more agents first."
          title="No runs to compare"
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.agentName}>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">{group.agentName}</CardTitle>
                <span className="text-xs text-muted">
                  {group.runs.length} run{group.runs.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-3 grid gap-2">
                {group.runs.map((run) => (
                  <button
                    className="grid gap-1 rounded-md border border-border bg-inset px-3 py-2 text-left transition hover:border-accent/60 hover:bg-panel-strong"
                    key={run.id}
                    onClick={() => onOpenRun(run.id)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={run.status} />
                      <span className="text-xs text-muted">{formatDuration(run.durationMs)}</span>
                    </div>
                    <span className="truncate text-xs text-muted">{run.startedAt}</span>
                    <span className="text-xs text-muted">
                      Exit: {run.exitCode === null ? "—" : run.exitCode}
                    </span>
                    {qualityByRun[run.id] && qualityByRun[run.id]!.total > 0 ? (
                      <span className="text-xs text-muted">
                        Checks: {qualityByRun[run.id]!.passed} passed · {qualityByRun[run.id]!.failed} failed
                      </span>
                    ) : (
                      <span className="text-xs text-muted">Checks: none</span>
                    )}
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
