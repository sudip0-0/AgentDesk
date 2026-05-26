import type { ProjectSummary } from "../../../shared/projectTypes";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";

interface DemoStep {
  title: string;
  detail: string;
  actionLabel: string;
  action: () => void;
  ready: boolean;
}

export function DemoFlowPanel({
  project,
  onOpenProject,
  onCreateTask,
  onLaunchAgent,
  onOpenTerminal,
  onRunChecks,
  onShowDiff,
  onMarkDone,
  onOpenRunDetail
}: {
  project: ProjectSummary | null;
  onOpenProject: () => void;
  onCreateTask: () => void;
  onLaunchAgent: () => void;
  onOpenTerminal: () => void;
  onRunChecks: () => void;
  onShowDiff: () => void;
  onMarkDone: () => void;
  onOpenRunDetail: () => void;
}): React.JSX.Element {
  const steps: DemoStep[] = [
    {
      title: "Open repo",
      detail: project ? project.path : "Select a local repository.",
      actionLabel: "Open Folder",
      action: onOpenProject,
      ready: true
    },
    {
      title: "Create task",
      detail: "Create a focused task contract for the demo.",
      actionLabel: "New Task",
      action: onCreateTask,
      ready: Boolean(project)
    },
    {
      title: "Launch agent",
      detail: "Launch the selected task with an agent profile.",
      actionLabel: "Launch Agent",
      action: onLaunchAgent,
      ready: Boolean(project)
    },
    {
      title: "Capture logs",
      detail: "Open terminal and transcript capture for the active run.",
      actionLabel: "Terminal",
      action: onOpenTerminal,
      ready: Boolean(project)
    },
    {
      title: "Run checks",
      detail: "Run configured quality commands and store results.",
      actionLabel: "Run Checks",
      action: onRunChecks,
      ready: Boolean(project)
    },
    {
      title: "Show diff",
      detail: "Review changed files and selected-file diffs.",
      actionLabel: "Git Diff",
      action: onShowDiff,
      ready: Boolean(project)
    },
    {
      title: "Review run",
      detail: "Show task, agent, command, prompt, transcript, files, checks, and duration.",
      actionLabel: "Run Detail",
      action: onOpenRunDetail,
      ready: Boolean(project)
    },
    {
      title: "Mark task done",
      detail: "Return to the task board and move the selected task to Done.",
      actionLabel: "Task Board",
      action: onMarkDone,
      ready: Boolean(project)
    }
  ];

  return (
    <section className="grid gap-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Demo Flow</CardTitle>
            <CardDescription>
              A portfolio-ready walkthrough using the real MVP screens, without adding cloud or PR automation.
            </CardDescription>
          </div>
          <Badge variant={project ? "success" : "warning"}>{project ? project.name : "No project"}</Badge>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <Card key={step.title}>
            <Badge className="mb-2">Step {index + 1}</Badge>
            <CardTitle>{step.title}</CardTitle>
            <CardDescription>{step.detail}</CardDescription>
            <Button
              className="mt-3"
              disabled={!step.ready}
              onClick={step.action}
              variant={index === 0 && !project ? "primary" : "secondary"}
            >
              {step.actionLabel}
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}
