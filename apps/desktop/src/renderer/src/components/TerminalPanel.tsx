import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type {
  TerminalDataEvent,
  TerminalErrorEvent,
  TerminalExitEvent,
  TerminalShell
} from "../../../shared/terminalTypes";
import "@xterm/xterm/css/xterm.css";

type TerminalStatus = "idle" | "starting" | "running" | "exited" | "error";

interface TerminalTab {
  id: string;
  title: string;
  sessionId: string | null;
  status: TerminalStatus;
  label: string;
  error: string | null;
}

interface TerminalPaneHandle {
  fit: () => { cols: number; rows: number } | null;
  clear: () => void;
}

let tabCounter = 1;

const createTab = (title?: string): TerminalTab => {
  const next = tabCounter++;
  return {
    id: crypto.randomUUID(),
    title: title ?? `Terminal ${next}`,
    sessionId: null,
    status: "idle",
    label: "Not started",
    error: null
  };
};

interface TerminalTabPaneProps {
  isActive: boolean;
  sessionId: string | null;
}

const TerminalTabPane = forwardRef<TerminalPaneHandle, TerminalTabPaneProps>(function TerminalTabPane(
  { isActive, sessionId },
  ref
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(sessionId);
  const isActiveRef = useRef(isActive);
  const lastFrameSizeRef = useRef({ width: 0, height: 0 });
  const resizeFrameRef = useRef<number | null>(null);

  sessionIdRef.current = sessionId;
  isActiveRef.current = isActive;

  const fitTerminal = useCallback((): { cols: number; rows: number } | null => {
    const terminal = terminalRef.current;
    const fitAddon = fitAddonRef.current;

    if (!terminal || !fitAddon || !isActive) {
      return null;
    }

    fitAddon.fit();

    const size = { cols: terminal.cols, rows: terminal.rows };

    if (sessionIdRef.current) {
      window.agentdesk.terminals.resize({
        id: sessionIdRef.current,
        cols: size.cols,
        rows: size.rows
      });
    }

    return size;
  }, [isActive]);

  useImperativeHandle(ref, () => ({
    fit: fitTerminal,
    clear: () => {
      terminalRef.current?.clear();
    }
  }));

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: "Consolas, 'Cascadia Mono', monospace",
      fontSize: 13,
      theme: {
        background: "#0d1117",
        foreground: "#d9e2ef",
        cursor: "#51b4a5"
      }
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    terminal.writeln("AgentDesk terminal ready.");
    terminal.writeln("Use Start to launch a shell in the selected working directory.");

    const inputDisposable = terminal.onData((data) => {
      const activeSessionId = sessionIdRef.current;

      if (activeSessionId) {
        window.agentdesk.terminals.write({ id: activeSessionId, data });
      }
    });

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }

      const { width, height } = entry.contentRect;
      const lastFrameSize = lastFrameSizeRef.current;

      if (
        Math.round(width) === Math.round(lastFrameSize.width) &&
        Math.round(height) === Math.round(lastFrameSize.height)
      ) {
        return;
      }

      lastFrameSizeRef.current = { width, height };

      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
      }

      resizeFrameRef.current = window.requestAnimationFrame(() => {
        resizeFrameRef.current = null;

        if (isActiveRef.current) {
          fitTerminal();
        }
      });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
      }
      inputDisposable.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [fitTerminal]);

  useEffect(() => {
    if (isActive) {
      requestAnimationFrame(() => {
        fitTerminal();
      });
    }
  }, [fitTerminal, isActive]);

  useEffect(() => {
    if (sessionId) {
      requestAnimationFrame(() => {
        fitTerminal();
      });
    }
  }, [fitTerminal, sessionId]);

  useEffect(() => {
    const removeDataListener = window.agentdesk.terminals.onData(
      ({ id, data }: TerminalDataEvent) => {
        if (id === sessionIdRef.current) {
          terminalRef.current?.write(data);
        }
      }
    );

    const removeExitListener = window.agentdesk.terminals.onExit(
      ({ id, exitCode }: TerminalExitEvent) => {
        if (id === sessionIdRef.current) {
          terminalRef.current?.writeln("");
          terminalRef.current?.writeln(`[process exited with code ${exitCode}]`);
        }
      }
    );

    const removeErrorListener = window.agentdesk.terminals.onError(
      ({ id, message }: TerminalErrorEvent) => {
        if (id === sessionIdRef.current) {
          terminalRef.current?.writeln("");
          terminalRef.current?.writeln(`[terminal error] ${message}`);
        }
      }
    );

    return () => {
      removeDataListener();
      removeExitListener();
      removeErrorListener();
    };
  }, []);

  return (
    <div
      className={isActive ? "terminal-tab-pane terminal-tab-pane-active" : "terminal-tab-pane"}
      ref={containerRef}
    />
  );
});

export function TerminalPanel(): React.JSX.Element {
  const initialState = useRef<{ tabs: TerminalTab[]; activeId: string } | null>(null);

  if (!initialState.current) {
    const tab = createTab("Terminal 1");
    initialState.current = { tabs: [tab], activeId: tab.id };
  }

  const [tabs, setTabs] = useState<TerminalTab[]>(initialState.current.tabs);
  const [activeTabId, setActiveTabId] = useState<string>(initialState.current.activeId);
  const [cwd, setCwd] = useState("");
  const [shell, setShell] = useState<TerminalShell>("powershell");
  const paneRefs = useRef<Map<string, TerminalPaneHandle | null>>(new Map());

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  const updateTab = useCallback((tabId: string, patch: Partial<TerminalTab>): void => {
    setTabs((current) => current.map((tab) => (tab.id === tabId ? { ...tab, ...patch } : tab)));
  }, []);

  const setPaneRef = useCallback((tabId: string, handle: TerminalPaneHandle | null) => {
    if (handle) {
      paneRefs.current.set(tabId, handle);
      return;
    }

    paneRefs.current.delete(tabId);
  }, []);

  const addTab = (): void => {
    const tab = createTab();
    setTabs((current) => [...current, tab]);
    setActiveTabId(tab.id);
  };

  const closeTab = async (tabId: string): Promise<void> => {
    const tab = tabs.find((entry) => entry.id === tabId);

    if (!tab) {
      return;
    }

    if (tab.sessionId) {
      try {
        await window.agentdesk.terminals.kill({ id: tab.sessionId });
      } catch {
        // Tab is removed even if kill fails.
      }
    }

    paneRefs.current.delete(tabId);

    setTabs((current) => {
      if (current.length === 1) {
        const replacement = createTab("Terminal 1");
        setActiveTabId(replacement.id);
        return [replacement];
      }

      const next = current.filter((entry) => entry.id !== tabId);

      if (activeTabId === tabId) {
        setActiveTabId(next[0]?.id ?? "");
      }

      return next;
    });
  };

  const startTerminal = async (): Promise<void> => {
    if (!activeTab || activeTab.sessionId || activeTab.status === "starting") {
      return;
    }

    const pane = paneRefs.current.get(activeTab.id);
    pane?.clear();
    const size = pane?.fit() ?? { cols: 80, rows: 24 };

    updateTab(activeTab.id, { status: "starting", error: null });

    try {
      const result = await window.agentdesk.terminals.create({
        cwd,
        shell,
        cols: size.cols,
        rows: size.rows
      });

      updateTab(activeTab.id, {
        sessionId: result.id,
        status: "running",
        label: `${result.shell} in ${result.cwd}`,
        title: activeTab.title.startsWith("Terminal ") ? result.shell : activeTab.title
      });

      requestAnimationFrame(() => {
        paneRefs.current.get(activeTab.id)?.fit();
      });
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Failed to start terminal.";
      updateTab(activeTab.id, {
        status: "error",
        error: message,
        label: "Failed to start"
      });
    }
  };

  const killTerminal = async (): Promise<void> => {
    if (!activeTab?.sessionId) {
      return;
    }

    try {
      await window.agentdesk.terminals.kill({ id: activeTab.sessionId });
      updateTab(activeTab.id, {
        sessionId: null,
        status: "exited",
        label: "Stopped"
      });
    } catch (killError) {
      const message = killError instanceof Error ? killError.message : "Failed to kill terminal.";
      updateTab(activeTab.id, { status: "error", error: message });
    }
  };

  useEffect(() => {
    const removeExitListener = window.agentdesk.terminals.onExit(({ id, exitCode }: TerminalExitEvent) => {
      setTabs((current) =>
        current.map((tab) =>
          tab.sessionId === id
            ? {
                ...tab,
                sessionId: null,
                status: "exited" as const,
                label: `Exited (${exitCode})`
              }
            : tab
        )
      );
    });

    const removeErrorListener = window.agentdesk.terminals.onError(
      ({ id, message }: TerminalErrorEvent) => {
        setTabs((current) =>
          current.map((tab) =>
            tab.sessionId === id ? { ...tab, status: "error" as const, error: message } : tab
          )
        );
      }
    );

    return () => {
      removeExitListener();
      removeErrorListener();
    };
  }, []);

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  useEffect(() => {
    return () => {
      for (const tab of tabsRef.current) {
        if (tab.sessionId) {
          void window.agentdesk.terminals.kill({ id: tab.sessionId }).catch(() => undefined);
        }
      }
    };
  }, []);

  const canStart =
    activeTab &&
    !activeTab.sessionId &&
    activeTab.status !== "starting" &&
    activeTab.status !== "running";
  const canKill = Boolean(activeTab?.sessionId);

  return (
    <section className="terminal-panel" aria-label="Embedded terminal">
      <div className="terminal-tab-bar" role="tablist" aria-label="Terminal tabs">
        {tabs.map((tab) => (
          <div
            className={tab.id === activeTabId ? "terminal-tab terminal-tab-active" : "terminal-tab"}
            key={tab.id}
            role="presentation"
          >
            <button
              aria-selected={tab.id === activeTabId}
              className="terminal-tab-button"
              onClick={() => setActiveTabId(tab.id)}
              role="tab"
              type="button"
            >
              <span className="terminal-tab-title">{tab.title}</span>
              {tab.sessionId ? <span className="terminal-tab-dot" aria-hidden /> : null}
            </button>
            <button
              aria-label={`Close ${tab.title}`}
              className="terminal-tab-close"
              onClick={() => void closeTab(tab.id)}
              type="button"
            >
              ×
            </button>
          </div>
        ))}
        <button className="terminal-tab-add" onClick={addTab} type="button">
          + New tab
        </button>
      </div>

      <div className="terminal-toolbar">
        <label className="cwd-field">
          <span>Working directory</span>
          <input
            onChange={(event) => setCwd(event.target.value)}
            placeholder="Blank uses your home folder"
            type="text"
            value={cwd}
          />
        </label>

        <label className="shell-field">
          <span>Shell</span>
          <select onChange={(event) => setShell(event.target.value as TerminalShell)} value={shell}>
            <option value="powershell">PowerShell</option>
            <option value="cmd">CMD</option>
          </select>
        </label>

        <div className="terminal-actions">
          <button disabled={!canStart} onClick={() => void startTerminal()} type="button">
            Start
          </button>
          <button disabled={!canKill} onClick={() => void killTerminal()} type="button">
            Kill
          </button>
        </div>
      </div>

      {activeTab ? (
        <div className="terminal-meta">
          <span className={`terminal-state terminal-state-${activeTab.status}`}>
            {activeTab.status}
          </span>
          <span>{activeTab.label}</span>
        </div>
      ) : null}

      {activeTab?.error ? <div className="terminal-error">{activeTab.error}</div> : null}

      <div className="terminal-frame">
        {tabs.map((tab) => (
          <TerminalTabPane
            isActive={tab.id === activeTabId}
            key={tab.id}
            ref={(handle) => setPaneRef(tab.id, handle)}
            sessionId={tab.sessionId}
          />
        ))}
      </div>
    </section>
  );
}
