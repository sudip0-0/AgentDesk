import type { ReactNode } from "react";
import { parseMarkdownBlocks, type MarkdownList } from "../../../../shared/markdownParser";

/**
 * Minimal, dependency-free markdown renderer for document previews.
 *
 * Parsing lives in shared/markdownParser (pure + tested); this file only maps
 * the block tree to React elements. It renders to elements, never
 * dangerouslySetInnerHTML, so repo content is never injected as raw HTML.
 * Supports headings, fenced code, ordered/unordered nested lists, blockquotes,
 * horizontal rules, tables, and inline code, bold, and italic spans.
 */

let inlineKey = 0;

const renderInline = (text: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
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

function MarkdownListView({ list, depth = 0 }: { list: MarkdownList; depth?: number }): React.JSX.Element {
  const ListTag = list.ordered ? "ol" : "ul";

  return (
    <ListTag
      className={`grid gap-1 pl-5 text-sm text-muted ${list.ordered ? "list-decimal" : "list-disc"} ${
        depth === 0 ? "mt-2" : "mt-1"
      }`}
    >
      {list.items.map((item, itemIndex) => (
        <li key={itemIndex}>
          {renderInline(item.text)}
          {item.children ? <MarkdownListView depth={depth + 1} list={item.children} /> : null}
        </li>
      ))}
    </ListTag>
  );
}

export function Markdown({
  content,
  className
}: {
  content: string;
  className?: string;
}): React.JSX.Element {
  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={className}>
      {blocks.map((block, blockIndex) => {
        const key = `block-${blockIndex}`;

        if (block.kind === "heading") {
          const Tag = `h${Math.min(block.level + 1, 6)}` as keyof React.JSX.IntrinsicElements;
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
          return <MarkdownListView key={key} list={block.list} />;
        }

        if (block.kind === "table") {
          return (
            <div className="mt-3 overflow-auto rounded-md border border-border" key={key}>
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-panel-strong">
                    {block.headers.map((header, headerIndex) => (
                      <th
                        className="border-b border-border px-3 py-2 font-bold text-text"
                        key={headerIndex}
                      >
                        {renderInline(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr className="odd:bg-[#10161d]" key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td className="border-b border-border px-3 py-2 text-muted" key={cellIndex}>
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
