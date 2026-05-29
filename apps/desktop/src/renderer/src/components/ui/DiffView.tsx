import { cn } from "../../lib/cn";

type DiffLineKind = "add" | "remove" | "hunk" | "meta" | "context";

const classifyLine = (line: string): DiffLineKind => {
  if (line.startsWith("@@")) {
    return "hunk";
  }

  if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("diff ") || line.startsWith("index ")) {
    return "meta";
  }

  if (line.startsWith("+")) {
    return "add";
  }

  if (line.startsWith("-")) {
    return "remove";
  }

  return "context";
};

const lineClasses: Record<DiffLineKind, string> = {
  add: "bg-accent/10 text-[#bfe9e3]",
  remove: "bg-danger/10 text-[#ffd0d0]",
  hunk: "bg-accent-strong/10 text-[#ffe0a3]",
  meta: "text-muted",
  context: "text-muted"
};

/**
 * Renders a unified git diff with per-line coloring for additions, deletions,
 * and hunk headers. Falls back to a plain message when there is no diff.
 */
export function DiffView({
  diff,
  emptyMessage = "No diff to display.",
  className
}: {
  diff: string;
  emptyMessage?: string;
  className?: string;
}): React.JSX.Element {
  if (!diff.trim()) {
    return (
      <pre className={cn("overflow-auto rounded-md border border-border bg-[#0d1117] p-3 text-xs text-muted", className)}>
        {emptyMessage}
      </pre>
    );
  }

  const lines = diff.split("\n");

  return (
    <div
      className={cn(
        "overflow-auto rounded-md border border-border bg-[#0d1117] p-1 font-mono text-xs leading-relaxed",
        className
      )}
    >
      {lines.map((line, index) => {
        const kind = classifyLine(line);

        return (
          <div
            className={cn("whitespace-pre-wrap break-words px-2 py-px", lineClasses[kind])}
            // Diff lines have no stable id; index is acceptable for a static render.
            key={index}
          >
            {line || " "}
          </div>
        );
      })}
    </div>
  );
}
