const navItems = ["Projects", "Tasks", "Runs", "Settings"];

export function App(): React.JSX.Element {
  const appName = window.agentdesk.app.getName();
  const phase = window.agentdesk.app.getPhase();

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-mark">AD</span>
          <div>
            <strong>{appName}</strong>
            <span>Local agent desk</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              className={item === "Projects" ? "nav-item nav-item-active" : "nav-item"}
              key={item}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Phase 1</span>
            <h1>{phase}</h1>
          </div>
          <div className="status-pill">Electron + React ready</div>
        </header>

        <main className="content" aria-label="AgentDesk home">
          <section className="panel">
            <h2>Foundation</h2>
            <p>
              The desktop shell is ready with a separated Electron main process,
              safe preload API, and React renderer.
            </p>
          </section>

          <section className="layout-grid" aria-label="Foundation status">
            <div className="status-card">
              <span>Main</span>
              <strong>Window lifecycle</strong>
              <p>Creates the Electron window and owns native capabilities.</p>
            </div>
            <div className="status-card">
              <span>Preload</span>
              <strong>Safe bridge</strong>
              <p>Exposes only a minimal read-only API to the renderer.</p>
            </div>
            <div className="status-card">
              <span>Renderer</span>
              <strong>React UI</strong>
              <p>Renders the sidebar, top bar, and main content area.</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
