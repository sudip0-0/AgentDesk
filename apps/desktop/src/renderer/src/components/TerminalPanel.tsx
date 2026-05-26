import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  TerminalDataEvent,
  TerminalErrorEvent,
  TerminalExitEvent
} from "../../../shared/terminalTypes";
import "@xterm/xterm/css/xterm.css";

type TerminalStatus = "idle" | "starting" | "running" | "exited" | "error";

export function TerminalPanel(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [cwd, setCwd] = useState("");
  const [sessionLabel, setSessionLabel] = useState("No active terminal");
  const [status, setStatus] = useState<TerminalStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const fitAndResize = useCallback(() => {
    const terminal = terminalRef.current;
    const fitAddon = fitAddonRef.current;
    const sessionId = sessionIdRef.current;

    if (!terminal || !fitAddon) {
      return;
    }

    fitAddon.fit();

    if (sessionId) {
      window.agentdesk.terminals.resize({
        id: sessionId,
        cols: terminal.cols,
        rows: terminal.rows
      });
    }
  }, []);

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
    terminal.writeln("AgentDesk terminal ready.");
    terminal.writeln("Choose a working directory or leave it blank for your home folder.");
    fitAddon.fit();

    const inputDisposable = terminal.onData((data) => {
      const sessionId = sessionIdRef.current;

      if (sessionId) {
        window.agentdesk.terminals.write({ id: sessionId, data });
      }
    });

    const resizeDisposable = terminal.onResize(({ cols, rows }) => {
      const sessionId = sessionIdRef.current;

      if (sessionId) {
        window.agentdesk.terminals.resize({ id: sessionId, cols, rows });
      }
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const resizeObserver = new ResizeObserver(() => {
      fitAndResize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      const sessionId = sessionIdRef.current;

      if (sessionId) {
        void window.agentdesk.terminals.kill({ id: sessionId }).catch(() => undefined);
      }

      resizeObserver.disconnect();
      inputDisposable.dispose();
      resizeDisposable.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      sessionIdRef.current = null;
    };
  }, [fitAndResize]);

  useEffect(() => {
    const removeDataListener = window.agentdesk.terminals.onData(({ id, data }: TerminalDataEvent) => {
      if (id === sessionIdRef.current) {
        terminalRef.current?.write(data);
      }
    });

    const removeExitListener = window.agentdesk.terminals.onExit(
      ({ id, exitCode }: TerminalExitEvent) => {
      if (id === sessionIdRef.current) {
        terminalRef.current?.writeln("");
        terminalRef.current?.writeln(`[process exited with code ${exitCode}]`);
        sessionIdRef.current = null;
        setStatus("exited");
        setSessionLabel("No active terminal");
      }
    });

    const removeErrorListener = window.agentdesk.terminals.onError(
      ({ id, message }: TerminalErrorEvent) => {
      if (id === sessionIdRef.current) {
        terminalRef.current?.writeln("");
        terminalRef.current?.writeln(`[terminal error] ${message}`);
        setError(message);
        setStatus("error");
      }
    });

    return () => {
      removeDataListener();
      removeExitListener();
      removeErrorListener();
    };
  }, []);

  const startTerminal = async (): Promise<void> => {
    if (!terminalRef.current || sessionIdRef.current) {
      return;
    }

    setStatus("starting");
    setError(null);
    terminalRef.current.clear();

    try {
      const result = await window.agentdesk.terminals.create({
        cwd,
        cols: terminalRef.current.cols,
        rows: terminalRef.current.rows
      });

      sessionIdRef.current = result.id;
      setSessionLabel(`${result.shell} in ${result.cwd}`);
      setStatus("running");
      terminalRef.current.focus();
      fitAndResize();
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Failed to start terminal.";
      terminalRef.current.writeln(`[terminal error] ${message}`);
      setError(message);
      setStatus("error");
      setSessionLabel("No active terminal");
    }
  };

  const killTerminal = async (): Promise<void> => {
    const sessionId = sessionIdRef.current;

    if (!sessionId) {
      return;
    }

    try {
      await window.agentdesk.terminals.kill({ id: sessionId });
      terminalRef.current?.writeln("");
      terminalRef.current?.writeln("[terminal killed]");
      sessionIdRef.current = null;
      setStatus("exited");
      setSessionLabel("No active terminal");
    } catch (killError) {
      const message = killError instanceof Error ? killError.message : "Failed to kill terminal.";
      setError(message);
      setStatus("error");
    }
  };

  return (
    <section className="terminal-panel" aria-label="Embedded terminal">
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

        <div className="terminal-actions">
          <button disabled={status === "running" || status === "starting"} onClick={startTerminal} type="button">
            Start
          </button>
          <button disabled={!sessionIdRef.current} onClick={killTerminal} type="button">
            Kill
          </button>
        </div>
      </div>

      <div className="terminal-meta">
        <span className={`terminal-state terminal-state-${status}`}>{status}</span>
        <span>{sessionLabel}</span>
      </div>

      {error ? <div className="terminal-error">{error}</div> : null}

      <div className="terminal-frame" ref={containerRef} />
    </section>
  );
}
