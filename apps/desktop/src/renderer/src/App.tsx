import { useEffect, useState } from "react";
import type { DatabaseHealth } from "../../shared/dbTypes";
import type { OpenProjectResult, ProjectSummary } from "../../shared/projectTypes";
import { TerminalPanel } from "./components/TerminalPanel";
import { Badge } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import { Card, CardDescription, CardTitle } from "./components/ui/Card";
import { Tabs } from "./components/ui/Tabs";
import { cn } from "./lib/cn";

const navItems = [
  { id: "projects", label: "Projects" },
  { id: "terminal", label: "Terminal" },
  { id: "tasks", label: "Tasks" },
  { id: "runs", label: "Runs" },
  { id: "settings", label: "Settings" }
];

export function App(): React.JSX.Element {
  const appName = window.agentdesk.app.getName();
  const phase = window.agentdesk.app.getPhase();
  const [activeNav, setActiveNav] = useState("projects");
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectMessage, setProjectMessage] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isOpeningProject, setIsOpeningProject] = useState(false);

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;

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
    <div className="grid min-h-screen grid-cols-[248px_1fr] bg-bg">
      <aside className="flex flex-col gap-7 border-r border-border bg-[#121820] p-5">
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

      <div className="grid min-w-0 grid-rows-[auto_1fr]">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-[#151b22] px-6 py-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-accent">Phase 2</span>
            <h1 className="mt-1 text-xl font-bold text-text">{phase}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dbHealth ? (
              <Badge variant={dbHealth.ok ? "success" : "danger"}>
                {dbHealth.ok ? "SQLite ready" : "SQLite error"}
              </Badge>
            ) : null}
            <Badge variant="success">PTY terminal ready</Badge>
            {activeProject ? <Badge>{activeProject.name}</Badge> : null}
          </div>
        </header>

        <main className="grid content-start gap-4 p-6">
          <Card>
            <CardTitle>Project Workspace</CardTitle>
            <CardDescription>
              Open a local folder, detect project metadata in the main process, and keep terminal
              operations scoped to the selected project.
            </CardDescription>
          </Card>

          {activeNav === "projects" ? (
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
                  <Card className="border-dashed">
                    <CardTitle>No project open</CardTitle>
                    <CardDescription>Select a local folder to start workspace detection.</CardDescription>
                  </Card>
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

              <ProjectOverview project={activeProject} />
            </section>
          ) : null}

          {activeNav === "terminal" ? <TerminalPanel project={activeProject} /> : null}

          <section className="grid gap-3 md:grid-cols-3">
            <Card>
              <Badge className="mb-2">Main</Badge>
              <CardTitle>PTY sessions</CardTitle>
              <CardDescription>Creates, tracks, resizes, kills terminals, and persists logs.</CardDescription>
            </Card>
            <Card>
              <Badge className="mb-2" variant="warning">
                Database
              </Badge>
              <CardTitle>SQLite storage</CardTitle>
              <CardDescription>
                {dbHealth?.message ?? "Checking local database..."}
              </CardDescription>
            </Card>
            <Card>
              <Badge className="mb-2">Renderer</Badge>
              <CardTitle>xterm.js + Tailwind UI</CardTitle>
              <CardDescription>
                Displays live output, paginated transcripts, and reusable UI primitives.
              </CardDescription>
            </Card>
          </section>

          {activeNav !== "terminal" && activeNav !== "projects" ? (
            <Card className={cn("border-dashed")}>
              <CardTitle>{navItems.find((item) => item.id === activeNav)?.label}</CardTitle>
              <CardDescription>This screen is planned for a later phase.</CardDescription>
            </Card>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function ProjectOverview({ project }: { project: ProjectSummary | null }): React.JSX.Element {
  if (!project) {
    return (
      <Card className="border-dashed">
        <CardTitle>Project Overview</CardTitle>
        <CardDescription>No project selected.</CardDescription>
      </Card>
    );
  }

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
          <CardTitle>Backlog ready</CardTitle>
          <CardDescription>Task summary is planned for Phase 3.</CardDescription>
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
          <CardDescription>No runs recorded for this project yet.</CardDescription>
        </Card>
      </section>

      <Card>
        <CardTitle>Next Recommended Task</CardTitle>
        <CardDescription>Create task records and wire them to this workspace in Phase 3.</CardDescription>
      </Card>
    </section>
  );
}
