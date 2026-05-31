import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { deliverPromptToTerminal } from "../../../shared/promptDelivery";
import { buildPrompt } from "../../../shared/promptEngine";
import type { PromptSendRequest } from "../../../shared/promptSendTypes";
import type { TerminalActivityState } from "../../../shared/terminalActivity";
import type {
  TerminalActivityEvent,
  TerminalDataEvent,
  TerminalErrorEvent,
  TerminalExitEvent,
  TerminalShell
} from "../../../shared/terminalTypes";
import type { ProjectSummary } from "../../../shared/projectTypes";
import type { QualityRunContext } from "../../../shared/qualityTypes";
import type { TaskTerminalLaunch } from "../../../shared/taskLaunchTypes";
import type { TerminalActionRequestType, UiActionRequest } from "../../../shared/uiActionTypes";
import { TranscriptPanel } from "./TranscriptPanel";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { StatusBadge } from "./ui/StatusBadge";
import { cn } from "../lib/cn";
import "@xterm/xterm/css/xterm.css";

type TerminalStatus = "idle" | "starting" | "running" | "exited" | "error";

interface TerminalTab {
  id: string;
  title: string;
  sessionId: string | null;
  runId: string | null;
  taskId: string | null;
  status: TerminalStatus;
  activity: TerminalActivityState;
  baseLabel: string;
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
    taskId: null,
    status: "idle",
    activity: "busy",
    baseLabel: "Not started",
    label: "Not started",
    error: null
  };
};

const formatRunningLabel = (
  tab: TerminalTab,
  activity: TerminalActivityState
): string => {
  if (activity === "waiting_for_input") {
    return "Waiting for input";
  }

  if (activity === "idle") {
    return "Idle — no recent output";
  }

  return tab.baseLabel;
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

interface TerminalPanelProps {
  project: ProjectSummary | null;
  launchRequest: TaskTerminalLaunch | null;
  promptSendRequest: PromptSendRequest | null;
  actionRequest?: UiActionRequest<TerminalActionRequestType> | null;
  isVisible?: boolean;
  onLaunchHandled: () => void;
  onPromptSendHandled: () => void;
  onActionHandled?: () => void;
  onRunQualityChecks: (context: QualityRunContext) => void;
  onTaskStatusChanged: () => void;
}

export function TerminalPanel({
  project,
  launchRequest,
  promptSendRequest,
  actionRequest,
  isVisible = true,
  onLaunchHandled,
  onPromptSendHandled,
  onActionHandled,
  onRunQualityChecks,
  onTaskStatusChanged
}: TerminalPanelProps): React.JSX.Element {
  const initialState = useRef<{ tabs: TerminalTab[]; activeId: string } | null>(null);

  if (!initialState.current) {
    const tab = createTab("Terminal 1");
    initialState.current = { tabs: [tab], activeId: tab.id };
  }

  const [tabs, setTabs] = useState<TerminalTab[]>(initialState.current.tabs);
  const [activeTabId, setActiveTabId] = useState<string>(initialState.current.activeId);
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
  const [cwd, setCwd] = useState("");
  const [shell, setShell] = useState<TerminalShell>("powershell");
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);
  const paneRefs = useRef<Map<string, TerminalPaneHandle | null>>(new Map());

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  // Refit the active terminal when the panel becomes visible again after being hidden.
  useEffect(() => {
    if (isVisible) {
      requestAnimationFrame(() => {
        paneRefs.current.get(activeTabIdRef.current)?.fit();
      });
    }
  }, [isVisible]);

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

  const cycleTab = (direction: 1 | -1): void => {
    const currentTabs = tabsRef.current;
    const currentIndex = currentTabs.findIndex((tab) => tab.id === activeTabIdRef.current);

    if (currentTabs.length === 0 || currentIndex < 0) {
      return;
    }

    const nextIndex = (currentIndex + direction + currentTabs.length) % currentTabs.length;
    setActiveTabId(currentTabs[nextIndex]?.id ?? activeTabIdRef.current);
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

  const startTerminal = useCallback(async (options?: {
    tabId?: string;
    taskId?: string;
    agentProfileId?: string;
  }): Promise<void> => {
    const currentTabs = tabsRef.current;
    const currentActive =
      currentTabs.find((entry) => entry.id === activeTabId) ?? currentTabs[0];
    const tab = options?.tabId
      ? currentTabs.find((entry) => entry.id === options.tabId)
      : currentActive;

    if (!tab || !project || tab.sessionId || tab.status === "starting") {
      return;
    }

    const pane = paneRefs.current.get(tab.id);
    pane?.clear();
    const size = pane?.fit() ?? { cols: 80, rows: 24 };

    updateTab(tab.id, { status: "starting", error: null });

    try {
      const result = await window.agentdesk.terminals.create({
        projectId: project.id,
        taskId: options?.taskId,
        agentProfileId: options?.agentProfileId,
        cwd,
        shell,
        cols: size.cols,
        rows: size.rows
      });

      const baseLabel = options?.taskId
        ? `Task run · ${result.shell}`
        : `${result.shell} in ${result.cwd}`;

      updateTab(tab.id, {
        sessionId: result.id,
        runId: result.runId,
        taskId: options?.taskId ?? null,
        status: "running",
        activity: "busy",
        baseLabel,
        label: baseLabel,
        title: tab.title.startsWith("Terminal ") ? result.shell : tab.title
      });

      if (options?.taskId) {
        onTaskStatusChanged();
      }

      requestAnimationFrame(() => {
        paneRefs.current.get(tab.id)?.fit();
      });
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Failed to start terminal.";
      updateTab(tab.id, {
        status: "error",
        error: message,
        label: "Failed to start"
      });
    }
  }, [activeTabId, cwd, onTaskStatusChanged, project, shell, updateTab]);

  useEffect(() => {
    if (!actionRequest) {
      return;
    }

    if (actionRequest.type === "new-tab") {
      addTab();
    } else if (actionRequest.type === "next-tab") {
      cycleTab(1);
    } else if (actionRequest.type === "previous-tab") {
      cycleTab(-1);
    } else if (actionRequest.type === "start-active") {
      void startTerminal();
    }

    onActionHandled?.();
  }, [actionRequest, onActionHandled, startTerminal]);

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
      let taskLinked = false;

      setTabs((current) =>
        current.map((tab) => {
          if (tab.sessionId !== id) {
            return tab;
          }

          if (tab.taskId) {
            taskLinked = true;
          }

          return {
            ...tab,
            sessionId: null,
            status: "exited" as const,
            label: tab.taskId ? `Task exited (${exitCode})` : `Exited (${exitCode})`
          };
        })
      );

      if (taskLinked) {
        onTaskStatusChanged();
      }
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

    const removeActivityListener = window.agentdesk.terminals.onActivity(
      ({ id, state }: TerminalActivityEvent) => {
        setTabs((current) =>
          current.map((tab) => {
            if (tab.sessionId !== id || tab.status !== "running") {
              return tab;
            }

            return {
              ...tab,
              activity: state,
              label: formatRunningLabel(tab, state)
            };
          })
        );
      }
    );

    return () => {
      removeExitListener();
      removeErrorListener();
      removeActivityListener();
    };
  }, [onTaskStatusChanged]);

  useEffect(() => {
    if (!launchRequest || !project || launchRequest.projectId !== project.id) {
      return;
    }

    let cancelled = false;

    const launchTaskTerminal = async (): Promise<void> => {
      const prompt = buildPrompt("implementation", { project, task: launchRequest.task });

      try {
        await navigator.clipboard.writeText(prompt);
        setLaunchMessage("Implementation prompt copied to clipboard. Paste it into the terminal.");
      } catch {
        setLaunchMessage("Could not copy the prompt to the clipboard. Build it from the task detail panel.");
      }

      const tab = createTab(launchRequest.task.title);
      setTabs((current) => [...current, tab]);
      setActiveTabId(tab.id);
      onLaunchHandled();

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      if (cancelled) {
        return;
      }

      await startTerminal({
        tabId: tab.id,
        taskId: launchRequest.task.id,
        agentProfileId: launchRequest.agentProfileId
      });
    };

    void launchTaskTerminal();

    return () => {
      cancelled = true;
    };
  }, [launchRequest, onLaunchHandled, project, startTerminal]);

  useEffect(() => {
    if (!promptSendRequest) {
      return;
    }

    if (!activeTab?.sessionId) {
      setLaunchMessage("Start a terminal before sending a prompt to the active session.");
      onPromptSendHandled();
      return;
    }

    const sessionId = activeTab.sessionId;
    let cancelled = false;

    const sendPrompt = async (): Promise<void> => {
      try {
        const result = await deliverPromptToTerminal({
          prompt: promptSendRequest.prompt,
          write: (data) => {
            window.agentdesk.terminals.write({ id: sessionId, data });
          },
          copyToClipboard: async (text) => {
            try {
              await navigator.clipboard.writeText(text);
              return true;
            } catch {
              return false;
            }
          }
        });

        if (cancelled) {
          return;
        }

        setLaunchMessage(
          result.copiedToClipboard
            ? `${promptSendRequest.label} copied to clipboard and sent to the active terminal line by line.`
            : `${promptSendRequest.label} sent to the active terminal. Clipboard copy failed.`
        );
      } catch {
        if (!cancelled) {
          setLaunchMessage("Failed to send the prompt to the active terminal.");
        }
      } finally {
        if (!cancelled) {
          onPromptSendHandled();
        }
      }
    };

    void sendPrompt();

    return () => {
      cancelled = true;
    };
  }, [activeTab?.sessionId, onPromptSendHandled, promptSendRequest]);

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
    Boolean(project) &&
    activeTab &&
    !activeTab.sessionId &&
    activeTab.status !== "starting" &&
    activeTab.status !== "running";
  const canKill = Boolean(activeTab?.sessionId);
  const canViewTranscript = Boolean(activeTab?.runId);

  const statusKey = (tab: TerminalTab): string => {
    if (tab.status === "running") {
      if (tab.activity === "waiting_for_input") {
        return "waiting_for_input";
      }

      if (tab.activity === "idle") {
        return "idle";
      }

      return "running";
    }

    return tab.status;
  };

  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onTabKeyDown = (event: React.KeyboardEvent, index: number): void => {
    const last = tabs.length - 1;
    let next = -1;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = index === last ? 0 : index + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = index === 0 ? last : index - 1;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = last;
    } else {
      return;
    }

    event.preventDefault();
    const target = tabs[next];

    if (target) {
      setActiveTabId(target.id);
      tabButtonRefs.current[next]?.focus();
    }
  };

  return (
    <section
      className="grid h-[clamp(430px,calc(100vh-300px),720px)] min-h-[430px] gap-2.5 rounded-lg border border-border bg-panel p-3.5"
      aria-label="Embedded terminal"
    >
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Terminal tabs">
        {tabs.map((tab, index) => (
          <div
            className={cn(
              "flex items-stretch overflow-hidden rounded-md border bg-inset",
              tab.id === activeTabId ? "border-accent/50 bg-panel-strong" : "border-border"
            )}
            key={tab.id}
            role="presentation"
          >
            <button
              aria-selected={tab.id === activeTabId}
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold text-muted outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-accent/70"
              onClick={() => setActiveTabId(tab.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              ref={(node) => {
                tabButtonRefs.current[index] = node;
              }}
              role="tab"
              tabIndex={tab.id === activeTabId ? 0 : -1}
              type="button"
            >
              <span className="max-w-[140px] truncate">{tab.title}</span>
              {tab.sessionId ? (
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    tab.activity === "waiting_for_input"
                      ? "bg-warning"
                      : tab.activity === "idle"
                        ? "bg-idle"
                        : "bg-accent"
                  )}
                  aria-hidden
                />
              ) : null}
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
          disabled={!project}
          label="Working directory"
          onChange={(event) => setCwd(event.target.value)}
          placeholder={project ? "Blank uses selected project root" : "Open a project first"}
          value={cwd}
        />

        <label className="grid gap-1.5">
          <span className="text-xs font-bold text-muted">Shell</span>
          <select
            className="w-full rounded-md border border-border bg-inset px-2.5 py-2 text-sm text-text"
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
          <Button
            disabled={!project || (!activeTab?.taskId && !activeTab?.runId)}
            onClick={() => {
              if (!activeTab) {
                return;
              }

              onRunQualityChecks({
                taskId: activeTab.taskId,
                agentRunId: activeTab.runId,
                taskTitle: activeTab.taskId ? activeTab.title : null
              });
            }}
            variant="secondary"
          >
            Run Quality Checks
          </Button>
        </div>
      </div>

      {launchMessage ? (
        <div className="rounded-md border border-accent/40 bg-accent/10 px-2.5 py-2 text-sm text-accent-soft">
          {launchMessage}
        </div>
      ) : null}

      {activeTab ? (
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted">
          <StatusBadge status={statusKey(activeTab)} />
          <span className="truncate">{activeTab.label}</span>
          {activeTab.taskId ? <Badge variant="warning">Task linked</Badge> : null}
        </div>
      ) : null}

      {activeTab?.error ? (
        <div className="rounded-md border border-danger/45 bg-danger/10 px-2.5 py-2 text-sm text-danger-soft">
          {activeTab.error}
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-[#28313b] bg-code p-2">
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
        projectId={project?.id ?? null}
        runId={activeTab?.runId ?? null}
      />
    </section>
  );
}
