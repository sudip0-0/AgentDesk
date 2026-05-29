import { useCallback, useEffect, useState } from "react";
import type { AgentRunDetail, AgentRunListItem } from "../../../shared/runDetailTypes";
import type { ProjectSummary } from "../../../shared/projectTypes";
import type { ReviewRecord } from "../../../shared/reviewTypes";
import { buildReviewSummary, type ReviewStatus } from "../../../shared/reviewSummary";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";
import { EmptyState } from "./ui/EmptyState";
import { PageHeader } from "./ui/PageHeader";
import { StatusBadge } from "./ui/StatusBadge";
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

const reviewStatusVariant = (status: ReviewStatus): "success" | "warning" | "danger" => {
  if (status === "passed") {
    return "success";
  }

  if (status === "warning") {
    return "warning";
  }

  return "danger";
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
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
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
      setReviews([]);
      return;
    }

    let cancelled = false;
    setReviewMessage(null);

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

    void window.agentdesk.runs
      .listReviews({ projectId: project.id, runId: selectedRunId })
      .then((loaded: ReviewRecord[]) => {
        if (!cancelled) {
          setReviews(loaded);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReviews([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [project, selectedRunId]);

  const saveReview = useCallback(async (): Promise<void> => {
    if (!project || !selectedRunId) {
      return;
    }

    setIsSavingReview(true);
    setReviewMessage(null);

    try {
      await window.agentdesk.runs.saveReview({ projectId: project.id, runId: selectedRunId });
      const loaded = await window.agentdesk.runs.listReviews({
        projectId: project.id,
        runId: selectedRunId
      });
      setReviews(loaded);
      setReviewMessage("Review saved to history.");
    } catch (saveError) {
      setReviewMessage(
        saveError instanceof Error ? saveError.message : "Failed to save review."
      );
    } finally {
      setIsSavingReview(false);
    }
  }, [project, selectedRunId]);

  if (!project) {
    return (
      <EmptyState
        description="Open a project before reviewing runs."
        title="No project selected"
      />
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(320px,420px)_1fr]">
      <div className="grid content-start gap-3">
        <PageHeader
          actions={
            <Button disabled={isLoading} onClick={() => void loadRuns(project.id)} variant="secondary">
              Refresh
            </Button>
          }
          subtitle={project.name}
          title="Agent Runs"
        />

        {error ? (
          <div className="rounded-md border border-danger/45 bg-danger/10 px-3 py-2 text-sm text-[#ffd0d0]">
            {error}
          </div>
        ) : null}

        {isLoading && runs.length === 0 ? (
          <EmptyState description="Loading runs..." title="Loading" />
        ) : null}

        {!isLoading && runs.length === 0 ? (
          <EmptyState
            description="Launch an agent from a task to create a run report."
            title="No runs recorded"
          />
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
                <StatusBadge status={run.status} />
              </div>
              <span className="truncate text-xs text-muted">{run.command}</span>
              <span className="text-xs text-muted">
                {run.startedAt} · {formatDuration(run.durationMs)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <RunDetail
        detail={detail}
        isSavingReview={isSavingReview}
        onSaveReview={() => void saveReview()}
        reviewMessage={reviewMessage}
        reviews={reviews}
      />
    </section>
  );
}

function ReviewSummaryCard({
  detail,
  reviews,
  isSavingReview,
  reviewMessage,
  onSaveReview
}: {
  detail: AgentRunDetail;
  reviews: ReviewRecord[];
  isSavingReview: boolean;
  reviewMessage: string | null;
  onSaveReview: () => void;
}): React.JSX.Element {
  const summary = buildReviewSummary({
    runStatus: detail.status,
    exitCode: detail.exitCode,
    qualityResults: detail.qualityResults.map((check) => ({ label: check.label, status: check.status })),
    changedFiles: detail.changedFiles.map((file) => ({ path: file.path, status: file.status }))
  });

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>Review Summary</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={reviewStatusVariant(summary.status)}>{summary.status}</Badge>
          <Button disabled={isSavingReview} onClick={onSaveReview} size="sm" variant="secondary">
            {isSavingReview ? "Saving..." : "Save Review"}
          </Button>
        </div>
      </div>
      <CardDescription>
        {summary.changedFileCount} changed file(s) · {summary.qualityCounts.passed} passed ·{" "}
        {summary.qualityCounts.failed} failed · {summary.qualityCounts.skipped} skipped ·{" "}
        {summary.qualityCounts.blocked} blocked
      </CardDescription>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Risks</span>
          {summary.risks.length === 0 ? (
            <p className="mt-1 text-sm text-muted">No risks detected.</p>
          ) : (
            <ul className="mt-1 grid gap-1">
              {summary.risks.map((risk) => (
                <li className="text-sm text-[#ffd0d0]" key={risk}>
                  • {risk}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-muted">Recommended Next</span>
          <ul className="mt-1 grid gap-1">
            {summary.recommendations.map((recommendation) => (
              <li className="text-sm text-muted" key={recommendation}>
                • {recommendation}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {reviewMessage ? (
        <div className="mt-3 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-[#bfe9e3]">
          {reviewMessage}
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <div className="mt-3 border-t border-border pt-3">
          <span className="text-xs font-bold uppercase tracking-wide text-muted">
            Saved Reviews ({reviews.length})
          </span>
          <ul className="mt-2 grid gap-1.5">
            {reviews.map((review) => (
              <li
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-[#10161d] px-2.5 py-1.5"
                key={review.id}
              >
                <span className="text-xs text-muted">{review.createdAt}</span>
                <Badge variant={reviewStatusVariant(review.status)}>{review.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

function RunDetail({
  detail,
  reviews,
  isSavingReview,
  reviewMessage,
  onSaveReview
}: {
  detail: AgentRunDetail | null;
  reviews: ReviewRecord[];
  isSavingReview: boolean;
  reviewMessage: string | null;
  onSaveReview: () => void;
}): React.JSX.Element {
  if (!detail) {
    return (
      <EmptyState
        description="Select a run to review command, prompt, transcript, diff, and checks."
        title="Run Detail"
      />
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
          <StatusBadge status={detail.status} />
        </div>
        {detail.errorMessage ? (
          <div className="mt-3 rounded-md border border-danger/45 bg-danger/10 px-3 py-2 text-sm text-[#ffd0d0]">
            <span className="font-bold">Error: </span>
            {detail.errorMessage}
          </div>
        ) : null}
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

      <ReviewSummaryCard
        detail={detail}
        isSavingReview={isSavingReview}
        onSaveReview={onSaveReview}
        reviewMessage={reviewMessage}
        reviews={reviews}
      />

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
                    <StatusBadge status={check.status} />
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
