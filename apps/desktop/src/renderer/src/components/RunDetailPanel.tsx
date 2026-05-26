import { useCallback, useEffect, useState } from "react";
import type { AgentRunDetail, AgentRunListItem } from "../../../shared/runDetailTypes";
import type { ProjectSummary } from "../../../shared/projectTypes";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { cn } from "../lib/cn";

const formatDuration = (durationMs: number | null): string => {
  if (durationMs === null) {
    return "running";
  }

  const seconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
};

const statusVariant = (status: string): "default" | "success" | "warning" | "danger" => {
  if (status === "completed") {
    return "success";
  }

  if (status === "running") {
    return "warning";
  }

  if (status === "failed" || status === "killed") {
    return "danger";
  }

  return "default";
};

export function RunDetailPanel({
  project,
  initialRunId
}: {
  project: ProjectSummary | null;
  initialRunId?: string | null;
}): React.JSX.Element {
  const [runs, setRuns] = useState<AgentRunListItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AgentRunDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = useCallback(async (projectId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedRuns = await window.agentdesk.runs.list(projectId);
      setRuns(loadedRuns);
      setSelectedRunId((current) =>
        current && loadedRuns.some((run: AgentRunListItem) => run.id === current)
          ? current
          : loadedRuns[0]?.id ?? null
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load runs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setDetail(null);
    setError(null);

    if (!project) {
      setRuns([]);
      setSelectedRunId(null);
      return;
    }

    void loadRuns(project.id);
  }, [loadRuns, project]);

  useEffect(() => {
    if (initialRunId) {
      setSelectedRunId(initialRunId);
    }
  }, [initialRunId, project?.id]);

  useEffect(() => {
    if (!project || !selectedRunId) {
      setDetail(null);
      return;
    }

    let cancelled = false;

    void window.agentdesk.runs
      .getDetail({ projectId: project.id, runId: selectedRunId })
      .then((runDetail: AgentRunDetail) => {
        if (!cancelled) {
          setDetail(runDetail);
          setError(null);
        }
      })
      .catch((detailError: unknown) => {
        if (!cancelled) {
          setDetail(null);
          setError(detailError instanceof Error ? detailError.message : "Failed to load run detail.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [project, selectedRunId]);

  if (!project) {
    return (
      <Card className="border-dashed">
        <CardTitle>No project selected</CardTitle>
        <CardDescription>Open a project before reviewing runs.</CardDescription>
      </Card>
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
      <div className="grid content-start gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Agent Runs</h2>
            <p className="mt-1 text-sm text-muted">{project.name}</p>
          </div>
          <Button disabled={isLoading} onClick={() => void loadRuns(project.id)} variant="secondary">
            Refresh
          </Button>
        </div>

        {error ? (
          <div className="rounded-md border border-danger/45 bg-danger/10 px-3 py-2 text-sm text-[#ffd0d0]">
            {error}
          </div>
        ) : null}

        {runs.length === 0 ? (
          <Card className="border-dashed">
            <CardTitle>No runs recorded</CardTitle>
            <CardDescription>Launch an agent from a task to create a run report.</CardDescription>
          </Card>
        ) : null}

        <div className="grid gap-2">
          {runs.map((run) => (
            <button
              className={cn(
                "grid gap-1 rounded-md border bg-panel p-3 text-left transition hover:bg-panel-strong",
                run.id === selectedRunId ? "border-accent/60" : "border-border"
              )}
              key={run.id}
              onClick={() => setSelectedRunId(run.id)}
              type="button"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold text-text">
                  {run.taskTitle ?? run.agentName ?? run.command}
                </span>
                <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
              </div>
              <span className="truncate text-xs text-muted">{run.command}</span>
              <span className="text-xs text-muted">
                {run.startedAt} · {formatDuration(run.durationMs)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <RunDetail detail={detail} />
    </section>
  );
}

function RunDetail({ detail }: { detail: AgentRunDetail | null }): React.JSX.Element {
  if (!detail) {
    return (
      <Card className="border-dashed">
        <CardTitle>Run Detail</CardTitle>
        <CardDescription>Select a run to review command, prompt, transcript, diff, and checks.</CardDescription>
      </Card>
    );
  }

  return (
    <section className="grid content-start gap-3">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{detail.task?.title ?? detail.agent?.name ?? "Agent Run"}</CardTitle>
            <CardDescription className="break-all">{detail.command}</CardDescription>
          </div>
          <Badge variant={statusVariant(detail.status)}>{detail.status}</Badge>
        </div>
        <div className="mt-3 grid gap-1 text-xs text-muted">
          <span>Agent: {detail.agent?.name ?? "none"}</span>
          <span>Task: {detail.task?.title ?? "none"}</span>
          <span>Started: {detail.startedAt}</span>
          <span>Finished: {detail.finishedAt ?? "not finished"}</span>
          <span>Duration: {formatDuration(detail.durationMs)}</span>
          <span>Exit code: {detail.exitCode ?? "none"}</span>
          <span>Notes: {detail.notes ?? "none"}</span>
        </div>
      </Card>

      <Card>
        <CardTitle>Prompt</CardTitle>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-[#0d1117] p-3 text-xs leading-relaxed text-muted">
          {detail.prompt ?? "No prompt stored for this run."}
        </pre>
      </Card>

      <Card>
        <CardTitle>Transcript</CardTitle>
        <CardDescription>
          {detail.logMeta.chunkCount} chunk(s), {detail.logMeta.characterCount} character(s)
          {detail.transcriptTruncated ? " · truncated for display" : ""}
        </CardDescription>
        <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-[#0d1117] p-3 text-xs leading-relaxed text-muted">
          {detail.transcript || "No terminal output captured."}
        </pre>
      </Card>

      <section className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardTitle>Changed Files</CardTitle>
          {detail.changedFiles.length === 0 ? (
            <CardDescription>No changed files detected.</CardDescription>
          ) : (
            <div className="mt-3 grid gap-2">
              {detail.changedFiles.map((file) => (
                <div className="rounded-md border border-border bg-[#10161d] px-3 py-2" key={file.path}>
                  <span className="block truncate text-sm font-bold text-text">{file.path}</span>
                  <span className="text-xs text-muted">{file.status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Quality Results</CardTitle>
          {detail.qualityResults.length === 0 ? (
            <CardDescription>No quality results linked to this run.</CardDescription>
          ) : (
            <div className="mt-3 grid gap-2">
              {detail.qualityResults.map((check) => (
                <div className="rounded-md border border-border bg-[#10161d] px-3 py-2" key={check.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-text">{check.label}</span>
                    <Badge variant={check.status === "passed" ? "success" : "danger"}>{check.status}</Badge>
                  </div>
                  <span className="mt-1 block truncate text-xs text-muted">{check.command}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </section>
  );
}
