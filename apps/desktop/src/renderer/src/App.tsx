import { TerminalPanel } from "./components/TerminalPanel";

const navItems = ["Projects", "Terminal", "Tasks", "Runs", "Settings"];

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
              className={item === "Terminal" ? "nav-item nav-item-active" : "nav-item"}
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
            <span className="eyebrow">Phase 2</span>
            <h1>{phase}</h1>
          </div>
          <div className="status-pill">PTY terminal ready</div>
        </header>

        <main className="content" aria-label="AgentDesk home">
          <section className="panel">
            <h2>Embedded Terminal</h2>
            <p>
              Terminal sessions run in the Electron main process and stream through
              a narrow preload API into the React renderer.
            </p>
          </section>

          <TerminalPanel />

          <section className="layout-grid" aria-label="Terminal status">
            <div className="status-card">
              <span>Main</span>
              <strong>PTY sessions</strong>
              <p>Creates, tracks, resizes, and kills terminal processes.</p>
            </div>
            <div className="status-card">
              <span>Preload</span>
              <strong>IPC bridge</strong>
              <p>Streams data and accepts terminal commands without exposing Node.</p>
            </div>
            <div className="status-card">
              <span>Renderer</span>
              <strong>xterm.js</strong>
              <p>Displays output, sends input, and mirrors resize events.</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
