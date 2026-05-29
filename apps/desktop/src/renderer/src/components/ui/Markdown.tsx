import type { ReactNode } from "react";

/**
 * Minimal, dependency-free markdown renderer for document previews.
 *
 * Supports headings, fenced code blocks, unordered/ordered lists, blockquotes,
 * horizontal rules, paragraphs, and inline code, bold, and italic spans. It
 * renders to React elements (no dangerouslySetInnerHTML), so repo content is
 * never injected as raw HTML. Unsupported syntax falls back to plain text.
 */

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "code"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "hr" }
  | { kind: "paragraph"; text: string };

let inlineKey = 0;

const renderInline = (text: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  // Split on inline code, bold, then italic, keeping delimiters.
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    inlineKey += 1;

    if (token.startsWith("`")) {
      nodes.push(
        <code className="rounded bg-panel-strong px-1 py-0.5 font-mono text-[0.85em] text-[#bfe9e3]" key={inlineKey}>
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong className="font-bold text-text" key={inlineKey}>
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      nodes.push(
        <em className="italic" key={inlineKey}>
          {token.slice(1, -1)}
        </em>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
};

const parseBlocks = (markdown: string): Block[] => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    // Fenced code block
    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").trimStart().startsWith("```")) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      index += 1; // skip closing fence
      blocks.push({ kind: "code", text: codeLines.join("\n") });
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ kind: "hr" });
      index += 1;
      continue;
    }

    // Heading
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1]!.length, text: heading[2]!.trim() });
      index += 1;
      continue;
    }

    // Blockquote
    if (line.trimStart().startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length && (lines[index] ?? "").trimStart().startsWith(">")) {
        quoteLines.push((lines[index] ?? "").replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push({ kind: "quote", text: quoteLines.join(" ") });
      continue;
    }

    // List (unordered or ordered)
    const isUnordered = /^\s*[-*+]\s+/.test(line);
    const isOrdered = /^\s*\d+\.\s+/.test(line);
    if (isUnordered || isOrdered) {
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index] ?? "";
        const unorderedMatch = /^\s*[-*+]\s+(.*)$/.exec(current);
        const orderedMatch = /^\s*\d+\.\s+(.*)$/.exec(current);

        if (isUnordered && unorderedMatch) {
          items.push(unorderedMatch[1]!);
        } else if (isOrdered && orderedMatch) {
          items.push(orderedMatch[1]!);
        } else {
          break;
        }

        index += 1;
      }
      blocks.push({ kind: "list", ordered: isOrdered, items });
      continue;
    }

    // Paragraph (gather consecutive non-blank, non-structural lines)
    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const current = lines[index] ?? "";
      if (
        current.trim() === "" ||
        current.trimStart().startsWith("```") ||
        /^(#{1,6})\s+/.test(current) ||
        /^\s*[-*+]\s+/.test(current) ||
        /^\s*\d+\.\s+/.test(current) ||
        current.trimStart().startsWith(">")
      ) {
        break;
      }
      paragraphLines.push(current.trim());
      index += 1;
    }
    blocks.push({ kind: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
};

const headingClass = (level: number): string => {
  switch (level) {
    case 1:
      return "text-lg font-bold text-text";
    case 2:
      return "text-base font-bold text-text";
    case 3:
      return "text-sm font-bold text-text";
    default:
      return "text-sm font-semibold text-muted";
  }
};

export function Markdown({
  content,
  className
}: {
  content: string;
  className?: string;
}): React.JSX.Element {
  const blocks = parseBlocks(content);

  return (
    <div className={className}>
      {blocks.map((block, blockIndex) => {
        const key = `block-${blockIndex}`;

        if (block.kind === "heading") {
          const Tag = (`h${Math.min(block.level + 1, 6)}` as keyof React.JSX.IntrinsicElements);
          return (
            <Tag className={`mt-4 first:mt-0 ${headingClass(block.level)}`} key={key}>
              {renderInline(block.text)}
            </Tag>
          );
        }

        if (block.kind === "code") {
          return (
            <pre
              className="mt-3 overflow-auto rounded-md border border-border bg-[#0d1117] p-3 font-mono text-xs leading-relaxed text-[#d9e2ef]"
              key={key}
            >
              {block.text}
            </pre>
          );
        }

        if (block.kind === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              className={`mt-2 grid gap-1 pl-5 text-sm text-muted ${block.ordered ? "list-decimal" : "list-disc"}`}
              key={key}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>{renderInline(item)}</li>
              ))}
            </ListTag>
          );
        }

        if (block.kind === "quote") {
          return (
            <blockquote
              className="mt-3 border-l-2 border-accent/50 pl-3 text-sm italic text-muted"
              key={key}
            >
              {renderInline(block.text)}
            </blockquote>
          );
        }

        if (block.kind === "hr") {
          return <hr className="mt-4 border-border" key={key} />;
        }

        return (
          <p className="mt-2 text-sm leading-relaxed text-muted" key={key}>
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
