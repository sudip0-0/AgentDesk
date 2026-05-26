import { useCallback, useEffect, useState } from "react";
import type { TerminalLogChunk } from "../../../shared/runLogTypes";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Dialog } from "./ui/Dialog";

const CHUNK_PAGE_SIZE = 30;

interface TranscriptPanelProps {
  projectId: string | null;
  runId: string | null;
  open: boolean;
  onClose: () => void;
}

export function TranscriptPanel({
  projectId,
  runId,
  open,
  onClose
}: TranscriptPanelProps): React.JSX.Element | null {
  const [text, setText] = useState("");
  const [chunkCount, setChunkCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [loadedChunks, setLoadedChunks] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (!runId || !projectId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const chunks = await window.agentdesk.runs.listLogChunks({
        runId,
        projectId,
        offset: loadedChunks,
        limit: CHUNK_PAGE_SIZE
      });

      if (chunks.length === 0) {
        return;
      }

      setText((current) => current + chunks.map((chunk: TerminalLogChunk) => chunk.chunk).join(""));
      setLoadedChunks((current) => current + chunks.length);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load transcript.");
    } finally {
      setLoading(false);
    }
  }, [loadedChunks, projectId, runId]);

  useEffect(() => {
    if (!open || !runId || !projectId) {
      return;
    }

    let cancelled = false;

    const loadInitial = async (): Promise<void> => {
      setText("");
      setLoadedChunks(0);
      setExportMessage(null);
      setLoading(true);
      setError(null);

      try {
        const meta = await window.agentdesk.runs.getLogMeta({ runId, projectId });

        if (cancelled) {
          return;
        }

        setChunkCount(meta.chunkCount);
        setCharacterCount(meta.characterCount);

        const chunks = await window.agentdesk.runs.listLogChunks({
          runId,
          projectId,
          offset: 0,
          limit: CHUNK_PAGE_SIZE
        });

        if (cancelled) {
          return;
        }

        setText(chunks.map((chunk: TerminalLogChunk) => chunk.chunk).join(""));
        setLoadedChunks(chunks.length);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load transcript.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, [open, projectId, runId]);

  const handleExport = async (): Promise<void> => {
    if (!runId || !projectId) {
      return;
    }

    try {
      const result = await window.agentdesk.runs.exportLog({ runId, projectId });

      if (result.exported && result.filePath) {
        setExportMessage(`Exported to ${result.filePath}`);
        return;
      }

      setExportMessage("Export cancelled.");
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Failed to export transcript.");
    }
  };

  const hasMore = loadedChunks < chunkCount;

  return (
    <Dialog
      description="Transcript chunks load in pages so large logs stay responsive."
      onClose={onClose}
      open={open}
      title="Terminal transcript"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="success">{chunkCount} chunks</Badge>
        <Badge>{characterCount.toLocaleString()} characters</Badge>
        {loading ? <Badge variant="warning">Loading</Badge> : null}
      </div>

      {error ? <p className="mb-3 text-sm text-[#ffd0d0]">{error}</p> : null}
      {exportMessage ? <p className="mb-3 text-sm text-muted">{exportMessage}</p> : null}

      <pre className="max-h-[50vh] overflow-auto rounded-md border border-border bg-[#0d1117] p-3 font-mono text-xs leading-relaxed text-[#d9e2ef] whitespace-pre-wrap break-words">
        {text || (loading ? "Loading transcript..." : "No transcript saved yet.")}
      </pre>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={!hasMore || loading} onClick={() => void loadMore()} variant="secondary">
          Load more
        </Button>
        <Button disabled={!runId || !projectId || !text} onClick={() => void handleExport()} variant="primary">
          Export transcript
        </Button>
      </div>
    </Dialog>
  );
}
