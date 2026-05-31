import type { ProjectOverview, ProjectSummary } from "../../../shared/projectTypes";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { EmptyState } from "./ui/EmptyState";
import { MetricCard } from "./ui/MetricCard";
import { PageHeader } from "./ui/PageHeader";
import { SkeletonCard } from "./ui/Skeleton";
import { StatusBadge } from "./ui/StatusBadge";

interface DashboardActions {
  onOpenWorkspace: () => void;
  onCreateTask: () => void;
  onLaunchAgent: () => void;
  onRunChecks: () => void;
  onReviewChanges: () => void;
  onOpenRun: (runId: string) => void;
}

export function DashboardPanel({
  project,
  overview,
  isLoading,
  error,
  actions
}: {
  project: ProjectSummary | null;
  overview: ProjectOverview | null;
  isLoading: boolean;
  error: string | null;
  actions: DashboardActions;
}): React.JSX.Element {
  if (!project) {
    const steps = [
      "Open a local project folder",
      "Break the work into tasks with clear acceptance criteria",
      "Pick a task and an agent profile",
      "Launch the agent in an embedded terminal",
      "Run quality checks and review the git diff",
      "Mark the task done or create a follow-up fix task"
    ];

    return (
      <section className="grid content-start gap-4">
        <PageHeader
          subtitle="A local-first command center for running coding agents through a task-driven workflow."
          title="Welcome to AgentDesk"
        />
        <Card>
          <CardTitle>Get started</CardTitle>
          <CardDescription>
            Open a project folder to begin. Here is the core loop AgentDesk is built around:
          </CardDescription>
          <ol className="mt-3 grid gap-2">
            {steps.map((step, index) => (
              <li className="flex items-start gap-3 text-sm text-muted" key={step}>
                <span className="grid size-5 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent/10 text-[11px] font-bold text-accent">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <Button onClick={actions.onOpenWorkspace} variant="primary">
              Open Workspace
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  const branch = project.metadata.isGitRepo
    ? project.metadata.currentBranch ?? "detached"
    : "Not a git repo";

  return (
    <section className="grid content-start gap-4">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={actions.onCreateTask} variant="primary">
              Create Task
            </Button>
            <Button onClick={actions.onLaunchAgent} variant="secondary">
              Launch Agent
            </Button>
            <Button onClick={actions.onRunChecks} variant="secondary">
              Run Checks
            </Button>
            <Button onClick={actions.onReviewChanges} variant="secondary">
              Review Changes
            </Button>
          </div>
        }
        subtitle={project.path}
        title={`Dashboard · ${project.name}`}
      />

      {error ? (
        <div className="rounded-md border border-danger/45 bg-danger/10 px-3 py-2 text-sm text-[#ffd0d0]">
          {error}
        </div>
      ) : null}

      {isLoading && !overview ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </div>
      ) : overview ? (
        <>
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              accessory={
                <StatusBadge status={project.metadata.isGitRepo ? "ready" : "missing"} label="Git" />
              }
              detail={project.metadata.packageManager}
              label="Branch"
              value={branch}
            />
            <MetricCard
              detail={`${overview.taskSummary.ready} ready · ${overview.taskSummary.backlog} backlog`}
              label="Active Tasks"
              value={overview.taskSummary.running}
            />
            <MetricCard
              detail={`${overview.taskSummary.done} done`}
              label="Needs Review"
              value={overview.taskSummary.needs_review}
            />
            <MetricCard
              accessory={
                overview.taskSummary.failed + overview.taskSummary.blocked > 0 ? (
                  <StatusBadge status="failed" label="Attention" />
                ) : undefined
              }
              detail={`${overview.taskSummary.blocked} blocked`}
              label="Failed Tasks"
              value={overview.taskSummary.failed}
            />
          </section>

          <section className="grid gap-3 xl:grid-cols-2">
            <Card>
              <CardTitle>Recent Runs</CardTitle>
              {overview.recentRuns.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {overview.recentRuns.map((run) => (
                    <button
                      className="grid gap-1 rounded-md border border-border bg-inset px-3 py-2 text-left transition hover:border-accent/60 hover:bg-panel-strong"
                      key={run.id}
                      onClick={() => actions.onOpenRun(run.id)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-text">
                          {run.taskTitle ?? run.command}
                        </span>
                        <StatusBadge status={run.status} />
                      </div>
                      <span className="truncate text-xs text-muted">{run.startedAt}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <CardDescription>No runs recorded yet. Launch an agent from a task.</CardDescription>
              )}
            </Card>

            <Card>
              <CardTitle>Next Recommended Task</CardTitle>
              {overview.nextTask ? (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-text">{overview.nextTask.title}</span>
                  <StatusBadge status={overview.nextTask.status} />
                </div>
              ) : (
                <CardDescription>
                  {overview.taskSummary.total > 0
                    ? "No ready or backlog tasks. Review the task board."
                    : "Create a task to get a recommendation here."}
                </CardDescription>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={actions.onCreateTask} variant="secondary">
                  Create Task
                </Button>
                <Button onClick={actions.onLaunchAgent} variant="secondary">
                  Launch Agent
                </Button>
              </div>
            </Card>
          </section>
        </>
      ) : (
        <EmptyState description="Select a project to load workspace details." title="No overview" />
      )}
    </section>
  );
}
