/**
 * Pure, dependency-free markdown block parser.
 *
 * Produces a structured block tree (headings, code, lists with nesting, tables,
 * blockquotes, rules, paragraphs) that a renderer turns into React elements.
 * Keeping this pure makes it unit-testable without a DOM. Unsupported syntax
 * falls back to paragraph text.
 */

export interface MarkdownListItem {
  text: string;
  children?: MarkdownList;
}

export interface MarkdownList {
  ordered: boolean;
  items: MarkdownListItem[];
}

export type MarkdownBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "code"; text: string }
  | { kind: "list"; list: MarkdownList }
  | { kind: "quote"; text: string }
  | { kind: "hr" }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "paragraph"; text: string };

const LIST_ITEM_PATTERN = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const HEADING_PATTERN = /^(#{1,6})\s+(.*)$/;
const HR_PATTERN = /^(-{3,}|\*{3,}|_{3,})$/;
const TABLE_SEPARATOR_PATTERN = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;

interface RawListItem {
  indent: number;
  ordered: boolean;
  text: string;
}

const isListLine = (line: string): boolean => LIST_ITEM_PATTERN.test(line);

const splitTableRow = (line: string): string[] => {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
};

const isTableSeparator = (line: string): boolean => TABLE_SEPARATOR_PATTERN.test(line);

const buildList = (
  items: RawListItem[],
  start: number,
  baseIndent: number
): { list: MarkdownList; next: number } => {
  const ordered = items[start]!.ordered;
  const resultItems: MarkdownListItem[] = [];
  let index = start;

  while (index < items.length && items[index]!.indent >= baseIndent) {
    const current = items[index]!;

    if (current.indent > baseIndent) {
      // Deeper item without a parent at this level; attach to the previous item.
      const { list: childList, next } = buildList(items, index, current.indent);
      const lastItem = resultItems[resultItems.length - 1];

      if (lastItem) {
        lastItem.children = childList;
      } else {
        resultItems.push({ text: "", children: childList });
      }

      index = next;
      continue;
    }

    const item: MarkdownListItem = { text: current.text };
    index += 1;

    if (index < items.length && items[index]!.indent > baseIndent) {
      const { list: childList, next } = buildList(items, index, items[index]!.indent);
      item.children = childList;
      index = next;
    }

    resultItems.push(item);
  }

  return { list: { ordered, items: resultItems }, next: index };
};

export const parseMarkdownBlocks = (markdown: string): MarkdownBlock[] => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
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
    if (HR_PATTERN.test(line.trim())) {
      blocks.push({ kind: "hr" });
      index += 1;
      continue;
    }

    // Heading
    const heading = HEADING_PATTERN.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1]!.length, text: heading[2]!.trim() });
      index += 1;
      continue;
    }

    // Table: header row followed by a separator row
    if (line.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1] ?? "")) {
      const headers = splitTableRow(line);
      const rows: string[][] = [];
      index += 2; // skip header + separator

      while (index < lines.length && (lines[index] ?? "").includes("|") && (lines[index] ?? "").trim() !== "") {
        rows.push(splitTableRow(lines[index] ?? ""));
        index += 1;
      }

      blocks.push({ kind: "table", headers, rows });
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

    // List (supports nesting via indentation)
    if (isListLine(line)) {
      const rawItems: RawListItem[] = [];

      while (index < lines.length && isListLine(lines[index] ?? "")) {
        const match = LIST_ITEM_PATTERN.exec(lines[index] ?? "");

        if (!match) {
          break;
        }

        rawItems.push({
          indent: match[1]!.length,
          ordered: /\d/.test(match[2]!),
          text: match[3]!
        });
        index += 1;
      }

      const baseIndent = Math.min(...rawItems.map((item) => item.indent));
      const { list } = buildList(rawItems, 0, baseIndent);
      blocks.push({ kind: "list", list });
      continue;
    }

    // Paragraph (consecutive non-structural lines)
    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const current = lines[index] ?? "";
      if (
        current.trim() === "" ||
        current.trimStart().startsWith("```") ||
        HEADING_PATTERN.test(current) ||
        isListLine(current) ||
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
