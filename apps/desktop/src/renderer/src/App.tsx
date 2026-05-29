import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgentProfileRecord } from "../../shared/agentProfileTypes";
import type { DatabaseHealth } from "../../shared/dbTypes";
import type { UiPreferences } from "../../shared/settingsTypes";import type { PromptSendRequest } from "../../shared/promptSendTypes";
import type { OpenProjectResult, ProjectOverview, ProjectSummary } from "../../shared/projectTypes";
import type { TaskTerminalLaunch } from "../../shared/taskLaunchTypes";
import type { TaskRecord } from "../../shared/taskTypes";
import { AgentProfilesPanel } from "./components/AgentProfilesPanel";
import { CommandPalette, type CommandPaletteAction } from "./components/CommandPalette";
import { DashboardPanel } from "./components/DashboardPanel";
import { DemoFlowPanel } from "./components/DemoFlowPanel";
import { DocumentsPanel } from "./components/DocumentsPanel";
import { GitPanel } from "./components/GitPanel";
import { QualityPanel } from "./components/QualityPanel";
import { RunDetailPanel } from "./components/RunDetailPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import type { DocumentPanelRequest } from "../../shared/documentTypes";
import type { QualityRunContext } from "../../shared/qualityTypes";
import type {
  QualityActionRequestType,
  TaskActionRequestType,
  TerminalActionRequestType,
  UiActionRequest
} from "../../shared/uiActionTypes";
import { TaskBoard } from "./components/TaskBoard";
import { TerminalPanel } from "./components/TerminalPanel";
import { useAppKeyboardShortcuts } from "./hooks/useAppKeyboardShortcuts";
import { Badge } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { Card, CardDescription, CardTitle } from "./components/ui/Card";
import { EmptyState } from "./components/ui/EmptyState";
import { StatusBadge } from "./components/ui/StatusBadge";
import { Tabs } from "./components/ui/Tabs";
import { cn } from "./lib/cn";

const navItems = [
  { id: "dashboard", label: "Dashboard" },
  { id: "projects", label: "Workspace" },
  { id: "terminal", label: "Terminal" },
  { id: "tasks", label: "Tasks" },
  { id: "agents", label: "Agents" },
  { id: "quality", label: "Quality" },
  { id: "git", label: "Git" },
  { id: "documents", label: "Docs" },
  { id: "runs", label: "Runs" },
  { id: "settings", label: "Settings" }
];

export function App(): React.JSX.Element {
  const appName = window.agentdesk.app.getName();
  const [activeNav, setActiveNav] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [overview, setOverview] = useState<ProjectOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [projectMessage, setProjectMessage] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isOpeningProject, setIsOpeningProject] = useState(false);
  const [terminalLaunch, setTerminalLaunch] = useState<TaskTerminalLaunch | null>(null);
  const [promptSendRequest, setPromptSendRequest] = useState<PromptSendRequest | null>(null);
  const [qualityRunContext, setQualityRunContext] = useState<QualityRunContext | null>(null);
  const [documentRequest, setDocumentRequest] = useState<DocumentPanelRequest | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runningAgentCount, setRunningAgentCount] = useState(0);
  const [taskActionRequest, setTaskActionRequest] = useState<UiActionRequest<TaskActionRequestType> | null>(
    null
  );
  const [terminalActionRequest, setTerminalActionRequest] = useState<
    UiActionRequest<TerminalActionRequestType> | null
  >(null);
  const [qualityActionRequest, setQualityActionRequest] = useState<
    UiActionRequest<QualityActionRequestType> | null
  >(null);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;

  const createUiAction = <T extends string>(type: T): UiActionRequest<T> => ({
    id: crypto.randomUUID(),
    type
  });

  const dispatchTaskAction = useCallback((type: TaskActionRequestType): void => {
    setActiveNav("tasks");
    setTaskActionRequest(createUiAction(type));
  }, []);

  const dispatchTerminalAction = useCallback((type: TerminalActionRequestType): void => {
    setActiveNav("terminal");
    setTerminalActionRequest(createUiAction(type));
  }, []);

  const dispatchQualityAction = useCallback((type: QualityActionRequestType): void => {
    setActiveNav("quality");
    setQualityActionRequest(createUiAction(type));
  }, []);

  const openRunDetail = useCallback((runId?: string | null): void => {
    if (runId) {
      setSelectedRunId(runId);
    }

    setActiveNav("runs");
  }, []);

  // Restore the last-selected run for the active project (fast resume).
  useEffect(() => {
    if (!prefsLoadedRef.current || !activeProjectId) {
      return;
    }

    void window.agentdesk.settings
      .getUi()
      .then((prefs: UiPreferences) => {
        const selection = prefs.projectSelections[activeProjectId];
        setSelectedRunId(selection?.runId ?? null);
      })
      .catch(() => undefined);
  }, [activeProjectId]);

  // Persist the selected run per project.
  useEffect(() => {
    if (!prefsLoadedRef.current || !activeProjectId || !selectedRunId) {
      return;
    }

    void window.agentdesk.settings
      .updateUi({ projectSelections: { [activeProjectId]: { runId: selectedRunId } } })
      .catch(() => undefined);
  }, [activeProjectId, selectedRunId]);

  useAppKeyboardShortcuts({
    onCommandPalette: () => setPaletteOpen(true),
    onCreateTask: () => dispatchTaskAction("create"),
    onLaunchAgent: () => dispatchTaskAction("launch-selected"),
    onRunChecks: () => dispatchQualityAction("run-all"),
    onOpenTerminal: () => setActiveNav("terminal"),
    onSwitchNav: (index) => {
      const item = navItems[index];

      if (item) {
        setActiveNav(item.id);
      }
    },
    onTerminalNextTab: () => dispatchTerminalAction("next-tab"),
    onTerminalPreviousTab: () => dispatchTerminalAction("previous-tab"),
    onTerminalNewTab: () => dispatchTerminalAction("new-tab")
  });

  const paletteActions = useMemo<CommandPaletteAction[]>(
    () => [
      {
        id: "create-task",
        label: "Create task",
        shortcut: "Ctrl+Shift+N",
        run: () => dispatchTaskAction("create")
      },
      {
        id: "launch-agent",
        label: "Launch agent for selected task",
        shortcut: "Ctrl+Shift+L",
        run: () => dispatchTaskAction("launch-selected")
      },
      {
        id: "run-checks",
        label: "Run quality checks",
        shortcut: "Ctrl+Shift+Q",
        run: () => dispatchQualityAction("run-all")
      },
      {
        id: "open-terminal",
        label: "Open terminal",
        shortcut: "Ctrl+Shift+`",
        run: () => setActiveNav("terminal")
      },
      {
        id: "new-terminal-tab",
        label: "New terminal tab",
        shortcut: "Ctrl+Shift+T",
        run: () => dispatchTerminalAction("new-tab")
      },
      {
        id: "open-runs",
        label: "Open run detail",
        shortcut: "Ctrl+8",
        run: () => openRunDetail()
      },
      {
        id: "open-git",
        label: "Open git panel",
        shortcut: "Ctrl+6",
        run: () => setActiveNav("git")
      }
    ],
    [dispatchQualityAction, dispatchTaskAction, dispatchTerminalAction, openRunDetail]
  );

  const applyOpenedProject = (result: OpenProjectResult): void => {
    setProjects((current) => {
      const next = current.some((project) => project.id === result.project.id)
        ? current.map((project) => (project.id === result.project.id ? result.project : project))
        : [...current, result.project];

      return next.sort((left, right) => left.name.localeCompare(right.name));
    });
    setActiveProjectId(result.project.id);
    setProjectMessage(result.duplicate ? "Project already exists; refreshed metadata." : "Project added.");
    setProjectError(null);
  };

  // Load persisted UI preferences (sidebar + last screen) once on mount.
  const prefsLoadedRef = useRef(false);
  useEffect(() => {
    void window.agentdesk.settings
      .getUi()
      .then((prefs: UiPreferences) => {
        setSidebarCollapsed(prefs.sidebarCollapsed);
        setActiveNav(prefs.lastActiveScreen);
      })
      .catch(() => {
        // Preferences are best-effort; fall back to defaults.
      })
      .finally(() => {
        prefsLoadedRef.current = true;
      });
  }, []);

  // Persist the active screen when it changes (after the initial load).
  useEffect(() => {
    if (!prefsLoadedRef.current) {
      return;
    }

    void window.agentdesk.settings.updateUi({ lastActiveScreen: activeNav }).catch(() => undefined);
  }, [activeNav]);

  // Persist the sidebar collapsed state when it changes (after the initial load).
  useEffect(() => {
    if (!prefsLoadedRef.current) {
      return;
    }

    void window.agentdesk.settings.updateUi({ sidebarCollapsed }).catch(() => undefined);
  }, [sidebarCollapsed]);

  // Running-agent count comes from the main process (source of truth) so it
  // reflects every active PTY session, not just the current terminal panel state.
  useEffect(() => {
    void window.agentdesk.terminals.getSessionCount().then(setRunningAgentCount).catch(() => undefined);

    const unsubscribe = window.agentdesk.terminals.onSessions(({ count }: { count: number }) => {
      setRunningAgentCount(count);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    void window.agentdesk.db.getHealth().then(setDbHealth).catch(() => {
      setDbHealth({
        ok: false,
        path: "",
        projectCount: 0,
        message: "Database is unavailable."
      });
    });
  }, []);

  useEffect(() => {
    void window.agentdesk.projects
      .list()
      .then((loadedProjects: ProjectSummary[]) => {
        setProjects(loadedProjects);
        setActiveProjectId(loadedProjects[0]?.id ?? null);
      })
      .catch((error: unknown) => {
        setProjectError(error instanceof Error ? error.message : "Failed to load projects.");
      });
  }, []);

  useEffect(() => {
    if (!activeProjectId) {
      setOverview(null);
      return;
    }

    let cancelled = false;
    setOverviewLoading(true);

    void window.agentdesk.projects
      .getOverview(activeProjectId)
      .then((data: ProjectOverview) => {
        if (!cancelled) {
          setOverview(data);
          setOverviewError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setOverview(null);
          setOverviewError(error instanceof Error ? error.message : "Failed to load project overview.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOverviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  const refreshOverview = (): void => {
    if (!activeProjectId) {
      return;
    }

    void window.agentdesk.projects
      .getOverview(activeProjectId)
      .then((data: ProjectOverview) => {
        setOverview(data);
        setOverviewError(null);
      })
      .catch((error: unknown) => {
        setOverviewError(error instanceof Error ? error.message : "Failed to refresh project overview.");
      });
  };

  const openProjectFolder = async (): Promise<void> => {
    setIsOpeningProject(true);
    setProjectMessage(null);
    setProjectError(null);

    try {
      const result = await window.agentdesk.projects.openFolder();

      if (result) {
        applyOpenedProject(result);
      }
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "Failed to open project folder.");
    } finally {
      setIsOpeningProject(false);
    }
  };

  return (
    <div
      className={cn(
        "grid min-h-screen bg-bg",
        sidebarCollapsed ? "grid-cols-1" : "grid-cols-[200px_1fr] xl:grid-cols-[248px_1fr]"
      )}
    >
      {sidebarCollapsed ? null : (
        <aside className="flex flex-col gap-7 border-r border-border bg-[#121820] p-4 xl:p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg border border-border bg-accent font-extrabold text-[#0e151a]">
              AD
            </span>
            <div>
              <strong className="block text-text">{appName}</strong>
              <span className="mt-0.5 block text-xs text-muted">Local agent desk</span>
            </div>
          </div>

          <Tabs activeId={activeNav} items={navItems} onChange={setActiveNav} />
        </aside>
      )}

      <div className="grid min-w-0 grid-rows-[auto_1fr]">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-[#151b22] px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              aria-label={sidebarCollapsed ? "Show navigation" : "Hide navigation"}
              onClick={() => setSidebarCollapsed((value) => !value)}
              size="sm"
              variant="ghost"
            >
              ☰
            </Button>
            <div className="min-w-0">
              <span className="text-xs font-bold uppercase tracking-wide text-accent">Workspace</span>
              <h1 className="mt-1 truncate text-xl font-bold text-text">
                {activeProject ? activeProject.name : "No workspace open"}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {runningAgentCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-bold text-[#bfe9e3]">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
                {runningAgentCount} running
              </span>
            ) : null}
            {activeProject?.metadata.isGitRepo && activeProject.metadata.currentBranch ? (
              <Badge>{activeProject.metadata.currentBranch}</Badge>
            ) : null}
            {dbHealth ? (
              <Badge variant={dbHealth.ok ? "success" : "danger"}>
                {dbHealth.ok ? "SQLite ready" : "SQLite error"}
              </Badge>
            ) : null}
            <Button onClick={() => setPaletteOpen(true)} size="sm" variant="secondary">
              Search ⌘K
            </Button>
          </div>
        </header>

        <main className="grid content-start gap-4 p-6">
          {activeNav === "dashboard" ? (
            <DashboardPanel
              actions={{
                onOpenWorkspace: () => void openProjectFolder(),
                onCreateTask: () => dispatchTaskAction("create"),
                onLaunchAgent: () => dispatchTaskAction("launch-selected"),
                onRunChecks: () => dispatchQualityAction("run-all"),
                onReviewChanges: () => setActiveNav("git"),
                onOpenRun: openRunDetail
              }}
              error={overviewError}
              isLoading={overviewLoading}
              overview={overview}
              project={activeProject}
            />
          ) : null}

          {activeNav === "projects" ? (
            <section className="grid gap-4">
              <DemoFlowPanel
                onCreateTask={() => dispatchTaskAction("create")}
                onLaunchAgent={() => dispatchTaskAction("launch-selected")}
                onMarkDone={() => setActiveNav("tasks")}
                onOpenProject={() => void openProjectFolder()}
                onOpenRunDetail={() => openRunDetail()}
                onOpenTerminal={() => setActiveNav("terminal")}
                onRunChecks={() => dispatchQualityAction("run-all")}
                onShowDiff={() => setActiveNav("git")}
                project={activeProject}
              />

              <section className="grid gap-4 xl:grid-cols-[minmax(280px,360px)_1fr]">
              <div className="grid content-start gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Projects</h2>
                  <Button
                    disabled={isOpeningProject}
                    onClick={() => void openProjectFolder()}
                    variant="primary"
                  >
                    Open Folder
                  </Button>
                </div>

                {projectMessage ? (
                  <div className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-[#bfe9e3]">
                    {projectMessage}
                  </div>
                ) : null}

                {projectError ? (
                  <div className="rounded-md border border-danger/45 bg-danger/10 px-3 py-2 text-sm text-[#ffd0d0]">
                    {projectError}
                  </div>
                ) : null}

                {projects.length === 0 ? (
                  <EmptyState
                    action={
                      <Button
                        disabled={isOpeningProject}
                        onClick={() => void openProjectFolder()}
                        variant="primary"
                      >
                        Open Workspace
                      </Button>
                    }
                    description="Open a project folder to start orchestrating agents."
                    title="No workspace selected"
                  />
                ) : null}

                {projects.map((project) => (
                  <button
                    className={cn(
                      "rounded-lg border bg-panel p-3 text-left transition hover:bg-panel-strong",
                      project.id === activeProject?.id ? "border-accent/60" : "border-border"
                    )}
                    key={project.id}
                    onClick={() => setActiveProjectId(project.id)}
                    type="button"
                  >
                    <span className="block truncate text-sm font-bold text-text">{project.name}</span>
                    <span className="mt-1 block truncate text-xs text-muted">{project.path}</span>
                  </button>
                ))}
              </div>

              <ProjectOverviewPanel
                error={overviewError}
                onOpenRun={openRunDetail}
                overview={overview}
              />
              </section>
            </section>
          ) : null}

          <div className={activeNav === "terminal" ? "" : "hidden"}>
            <TerminalPanel
              actionRequest={terminalActionRequest}
              isVisible={activeNav === "terminal"}
              launchRequest={terminalLaunch}
              onActionHandled={() => setTerminalActionRequest(null)}
              onLaunchHandled={() => setTerminalLaunch(null)}
              onPromptSendHandled={() => setPromptSendRequest(null)}
              onRunQualityChecks={(context) => {
                setQualityRunContext(context);
                setActiveNav("quality");
              }}
              onTaskStatusChanged={refreshOverview}
              promptSendRequest={promptSendRequest}
              project={activeProject}
            />
          </div>

          {activeNav === "tasks" ? (
            <TaskBoard
              actionRequest={taskActionRequest}
              onActionHandled={() => setTaskActionRequest(null)}
              onLaunchInTerminal={(task: TaskRecord, agentProfile?: AgentProfileRecord) => {
                if (!activeProject) {
                  return;
                }

                setTerminalLaunch({
                  projectId: activeProject.id,
                  task,
                  agentProfileId: agentProfile?.id,
                  agentProfileName: agentProfile?.name
                });
                setActiveNav("terminal");
              }}
              onRunQualityChecks={(task) => {
                setQualityRunContext({ taskId: task.id, taskTitle: task.title });
                setActiveNav("quality");
              }}
              onSyncProgress={() => {
                setDocumentRequest({ mode: "progress" });
                setActiveNav("documents");
              }}
              onSendPromptToTerminal={(request: PromptSendRequest) => {
                setPromptSendRequest(request);
                setActiveNav("terminal");
              }}
              onTasksChanged={refreshOverview}
              project={activeProject}
            />
          ) : null}

          {activeNav === "agents" ? <AgentProfilesPanel /> : null}

          {activeNav === "quality" ? (
            <QualityPanel
              actionRequest={qualityActionRequest}
              onActionHandled={() => setQualityActionRequest(null)}
              onClearRunContext={() => setQualityRunContext(null)}
              onFixTaskCreated={refreshOverview}
              project={activeProject}
              runContext={qualityRunContext}
            />
          ) : null}

          {activeNav === "git" ? <GitPanel project={activeProject} /> : null}

          {activeNav === "documents" ? (
            <DocumentsPanel
              onRequestHandled={() => setDocumentRequest(null)}
              project={activeProject}
              request={documentRequest}
            />
          ) : null}

          {activeNav === "runs" ? (
            <RunDetailPanel initialRunId={selectedRunId} project={activeProject} />
          ) : null}

          {activeNav === "settings" ? <SettingsPanel /> : null}
        </main>
      </div>

      <CommandPalette actions={paletteActions} onClose={() => setPaletteOpen(false)} open={paletteOpen} />
    </div>
  );
}

function ProjectOverviewPanel({
  overview,
  error,
  onOpenRun
}: {
  overview: ProjectOverview | null;
  error: string | null;
  onOpenRun: (runId: string) => void;
}): React.JSX.Element {
  if (error) {
    return (
      <Card className="border-danger/45">
        <CardTitle>Project Overview</CardTitle>
        <CardDescription>{error}</CardDescription>
      </Card>
    );
  }

  if (!overview) {
    return (
      <Card className="border-dashed">
        <CardTitle>Project Overview</CardTitle>
        <CardDescription>Select a project to load workspace details.</CardDescription>
      </Card>
    );
  }

  const { project, taskSummary, recentRuns, nextTask } = overview;
  const scripts = project.metadata.scripts;

  return (
    <section className="grid content-start gap-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{project.name}</CardTitle>
            <CardDescription className="break-all">{project.path}</CardDescription>
          </div>
          <Badge variant={project.metadata.hasPackageJson ? "success" : "warning"}>
            {project.metadata.hasPackageJson ? "package.json found" : "No package.json"}
          </Badge>
        </div>
      </Card>

      <section className="grid gap-3 md:grid-cols-3">
        <Card>
          <Badge className="mb-2">Package</Badge>
          <CardTitle>{project.metadata.packageManager}</CardTitle>
          <CardDescription>Detected package manager.</CardDescription>
        </Card>
        <Card>
          <Badge className="mb-2" variant={project.metadata.isGitRepo ? "success" : "warning"}>
            Git
          </Badge>
          <CardTitle>{project.metadata.isGitRepo ? "Repository" : "Not detected"}</CardTitle>
          <CardDescription>{project.metadata.currentBranch ?? "No branch detected"}</CardDescription>
        </Card>
        <Card>
          <Badge className="mb-2">Tasks</Badge>
          <CardTitle>{taskSummary.total} total</CardTitle>
          <CardDescription>
            {taskSummary.ready} ready · {taskSummary.running} running · {taskSummary.done} done
          </CardDescription>
        </Card>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardTitle>Scripts</CardTitle>
          {scripts.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {scripts.map((script) => (
                <div
                  className="grid gap-1 rounded-md border border-border bg-[#10161d] px-3 py-2"
                  key={script.name}
                >
                  <span className="text-sm font-bold text-text">{script.name}</span>
                  <code className="break-all text-xs text-muted">{script.command}</code>
                </div>
              ))}
            </div>
          ) : (
            <CardDescription>No npm scripts detected.</CardDescription>
          )}
        </Card>

        <Card>
          <CardTitle>Recent Runs</CardTitle>
          {recentRuns.length > 0 ? (
            <div className="mt-3 grid gap-2">
              {recentRuns.map((run) => (
                <button
                  className="grid gap-1 rounded-md border border-border bg-[#10161d] px-3 py-2 text-left transition hover:border-accent/60 hover:bg-panel-strong"
                  key={run.id}
                  onClick={() => onOpenRun(run.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-text">
                      {run.taskTitle ?? run.command}
                    </span>
                    <StatusBadge status={run.status} />
                  </div>
                  {run.taskTitle ? (
                    <span className="text-xs text-muted">{run.command}</span>
                  ) : null}
                  <span className="text-xs text-muted">{run.startedAt}</span>
                  {run.summary ? <span className="text-xs text-muted">{run.summary}</span> : null}
                </button>
              ))}
            </div>
          ) : (
            <CardDescription>No runs recorded for this project yet.</CardDescription>
          )}
        </Card>
      </section>

      <Card>
        <CardTitle>Next Recommended Task</CardTitle>
        {nextTask ? (
          <div className="mt-2">
            <span className="text-sm font-bold text-text">{nextTask.title}</span>
            <CardDescription>Status: {nextTask.status}</CardDescription>
          </div>
        ) : (
          <CardDescription>
            {taskSummary.total > 0
              ? "No ready or backlog tasks found. Review tasks in Phase 3."
              : "Create tasks in Phase 3 to get recommendations here."}
          </CardDescription>
        )}
      </Card>
    </section>
  );
}
