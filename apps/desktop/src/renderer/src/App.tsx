import { useEffect, useState } from "react";
import type { DatabaseHealth } from "../../shared/dbTypes";
import { TerminalPanel } from "./components/TerminalPanel";
import { Badge } from "./components/ui/Badge";
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
  const [activeNav, setActiveNav] = useState("terminal");
  const [dbHealth, setDbHealth] = useState<DatabaseHealth | null>(null);

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
            <span className="text-xs font-bold uppercase tracking-wide text-accent">Phase 1</span>
            <h1 className="mt-1 text-xl font-bold text-text">{phase}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dbHealth ? (
              <Badge variant={dbHealth.ok ? "success" : "danger"}>
                {dbHealth.ok ? "SQLite ready" : "SQLite error"}
              </Badge>
            ) : null}
            <Badge variant="success">PTY terminal ready</Badge>
          </div>
        </header>

        <main className="grid content-start gap-4 p-6">
          <Card>
            <CardTitle>Embedded Terminal</CardTitle>
            <CardDescription>
              Terminal sessions run in the Electron main process, stream through a narrow preload
              API, and save redacted output chunks to SQLite per agent run.
            </CardDescription>
          </Card>

          {activeNav === "terminal" ? <TerminalPanel /> : null}

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

          {activeNav !== "terminal" ? (
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
