import { cn } from "../../lib/cn";
import { diffLineTokens, type DiffSegment } from "../../../../shared/diffHighlight";

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
  add: "bg-accent/10 text-accent-soft",
  remove: "bg-danger/10 text-danger-soft",
  hunk: "bg-accent-strong/10 text-warning-soft",
  meta: "text-muted",
  context: "text-muted"
};

const intraClasses: Record<"add" | "remove", string> = {
  add: "rounded-sm bg-accent/30 text-text",
  remove: "rounded-sm bg-danger/30 text-text"
};

interface RenderedLine {
  kind: DiffLineKind;
  content: string;
  segments?: DiffSegment[];
}

/**
 * Builds rendered lines, computing intra-line (word-level) segments for each
 * removed line that is immediately followed by an added line in the same hunk.
 */
const buildRenderedLines = (lines: string[]): RenderedLine[] => {
  const rendered: RenderedLine[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const kind = classifyLine(line);
    const nextLine = lines[index + 1];

    if (kind === "remove" && nextLine !== undefined && classifyLine(nextLine) === "add") {
      const { removed, addedSegments } = diffLineTokens(line.slice(1), nextLine.slice(1));
      rendered.push({ kind: "remove", content: line, segments: removed });
      rendered.push({ kind: "add", content: nextLine, segments: addedSegments });
      index += 1; // consume the paired add line
      continue;
    }

    rendered.push({ kind, content: line });
  }

  return rendered;
};

const renderSegments = (
  kind: "add" | "remove",
  prefix: string,
  segments: DiffSegment[]
): React.JSX.Element => (
  <>
    {prefix}
    {segments.map((segment, segmentIndex) =>
      segment.changed ? (
        <span className={intraClasses[kind]} key={segmentIndex}>
          {segment.text}
        </span>
      ) : (
        <span key={segmentIndex}>{segment.text}</span>
      )
    )}
  </>
);

/**
 * Renders a unified git diff with per-line coloring plus word-level highlighting
 * of changed tokens within paired removed/added lines.
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
      <pre className={cn("overflow-auto rounded-md border border-border bg-code p-3 text-xs text-muted", className)}>
        {emptyMessage}
      </pre>
    );
  }

  const rendered = buildRenderedLines(diff.split("\n"));

  return (
    <div
      className={cn(
        "overflow-auto rounded-md border border-border bg-code p-1 font-mono text-xs leading-relaxed",
        className
      )}
    >
      {rendered.map((line, index) => (
        <div
          className={cn("whitespace-pre-wrap break-words px-2 py-px", lineClasses[line.kind])}
          key={index}
        >
          {line.segments && (line.kind === "add" || line.kind === "remove")
            ? renderSegments(line.kind, line.content.slice(0, 1), line.segments)
            : line.content || " "}
        </div>
      ))}
    </div>
  );
}
