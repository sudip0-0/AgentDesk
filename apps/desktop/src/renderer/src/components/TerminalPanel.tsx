import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type {
  TerminalDataEvent,
  TerminalErrorEvent,
  TerminalExitEvent,
  TerminalShell
} from "../../../shared/terminalTypes";
import { TranscriptPanel } from "./TranscriptPanel";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { cn } from "../lib/cn";
import "@xterm/xterm/css/xterm.css";

type TerminalStatus = "idle" | "starting" | "running" | "exited" | "error";

interface TerminalTab {
  id: string;
  title: string;
  sessionId: string | null;
  runId: string | null;
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
    runId: null,
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
      className={cn(
        "absolute inset-2",
        isActive ? "visible pointer-events-auto" : "invisible pointer-events-none"
      )}
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
  const [transcriptOpen, setTranscriptOpen] = useState(false);
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
        runId: result.runId,
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
  const canViewTranscript = Boolean(activeTab?.runId);

  const statusVariant = (status: TerminalStatus): "default" | "success" | "warning" | "danger" => {
    if (status === "running") {
      return "success";
    }

    if (status === "starting") {
      return "warning";
    }

    if (status === "error") {
      return "danger";
    }

    return "default";
  };

  return (
    <section
      className="grid h-[clamp(430px,calc(100vh-300px),720px)] min-h-[430px] gap-2.5 rounded-lg border border-border bg-panel p-3.5"
      aria-label="Embedded terminal"
    >
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Terminal tabs">
        {tabs.map((tab) => (
          <div
            className={cn(
              "flex items-stretch overflow-hidden rounded-md border bg-[#10161d]",
              tab.id === activeTabId ? "border-accent/50 bg-panel-strong" : "border-border"
            )}
            key={tab.id}
            role="presentation"
          >
            <button
              aria-selected={tab.id === activeTabId}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold text-muted hover:text-text"
              onClick={() => setActiveTabId(tab.id)}
              role="tab"
              type="button"
            >
              <span className="max-w-[140px] truncate">{tab.title}</span>
              {tab.sessionId ? <span className="size-1.5 rounded-full bg-accent" aria-hidden /> : null}
            </button>
            <button
              aria-label={`Close ${tab.title}`}
              className="border-l border-border px-2 text-muted hover:text-text"
              onClick={() => void closeTab(tab.id)}
              type="button"
            >
              ×
            </button>
          </div>
        ))}
        <Button onClick={addTab} size="sm" variant="ghost">
          + New tab
        </Button>
      </div>

      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_160px_auto]">
        <Input
          label="Working directory"
          onChange={(event) => setCwd(event.target.value)}
          placeholder="Blank uses your home folder"
          value={cwd}
        />

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-muted">Shell</span>
          <select
            className="w-full rounded-md border border-border bg-[#10161d] px-2.5 py-2 text-sm text-text"
            onChange={(event) => setShell(event.target.value as TerminalShell)}
            value={shell}
          >
            <option value="powershell">PowerShell</option>
            <option value="cmd">CMD</option>
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          <Button disabled={!canStart} onClick={() => void startTerminal()} variant="primary">
            Start
          </Button>
          <Button disabled={!canKill} onClick={() => void killTerminal()} variant="danger">
            Kill
          </Button>
          <Button
            disabled={!canViewTranscript}
            onClick={() => setTranscriptOpen(true)}
            variant="secondary"
          >
            Transcript
          </Button>
        </div>
      </div>

      {activeTab ? (
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted">
          <Badge variant={statusVariant(activeTab.status)}>{activeTab.status}</Badge>
          <span className="truncate">{activeTab.label}</span>
        </div>
      ) : null}

      {activeTab?.error ? (
        <div className="rounded-md border border-danger/45 bg-danger/10 px-2.5 py-2 text-sm text-[#ffd0d0]">
          {activeTab.error}
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-[#28313b] bg-[#0d1117] p-2">
        {tabs.map((tab) => (
          <TerminalTabPane
            isActive={tab.id === activeTabId}
            key={tab.id}
            ref={(handle) => setPaneRef(tab.id, handle)}
            sessionId={tab.sessionId}
          />
        ))}
      </div>
      <TranscriptPanel
        onClose={() => setTranscriptOpen(false)}
        open={transcriptOpen}
        runId={activeTab?.runId ?? null}
      />
    </section>
  );
}
