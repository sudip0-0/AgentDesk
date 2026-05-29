import { describe, expect, it } from "vitest";
import { parseMarkdownBlocks } from "./markdownParser.js";

describe("parseMarkdownBlocks", () => {
  it("parses headings with levels", () => {
    const blocks = parseMarkdownBlocks("# Title\n## Sub");
    expect(blocks).toEqual([
      { kind: "heading", level: 1, text: "Title" },
      { kind: "heading", level: 2, text: "Sub" }
    ]);
  });

  it("parses fenced code blocks verbatim", () => {
    const blocks = parseMarkdownBlocks("```\nconst x = 1;\n```");
    expect(blocks).toEqual([{ kind: "code", text: "const x = 1;" }]);
  });

  it("parses a flat unordered list", () => {
    const blocks = parseMarkdownBlocks("- one\n- two");
    expect(blocks).toEqual([
      {
        kind: "list",
        list: {
          ordered: false,
          items: [{ text: "one" }, { text: "two" }]
        }
      }
    ]);
  });

  it("parses nested lists by indentation", () => {
    const blocks = parseMarkdownBlocks("- parent\n  - child a\n  - child b\n- sibling");
    expect(blocks).toHaveLength(1);
    const block = blocks[0]!;
    expect(block.kind).toBe("list");

    if (block.kind === "list") {
      expect(block.list.items).toHaveLength(2);
      expect(block.list.items[0]!.text).toBe("parent");
      expect(block.list.items[0]!.children?.items.map((item) => item.text)).toEqual([
        "child a",
        "child b"
      ]);
      expect(block.list.items[1]!.text).toBe("sibling");
    }
  });

  it("detects ordered lists", () => {
    const blocks = parseMarkdownBlocks("1. first\n2. second");
    expect(blocks[0]).toMatchObject({ kind: "list", list: { ordered: true } });
  });

  it("parses a table with headers and rows", () => {
    const blocks = parseMarkdownBlocks(
      "| Name | Status |\n| --- | --- |\n| Lint | Passed |\n| Test | Failed |"
    );

    expect(blocks).toEqual([
      {
        kind: "table",
        headers: ["Name", "Status"],
        rows: [
          ["Lint", "Passed"],
          ["Test", "Failed"]
        ]
      }
    ]);
  });

  it("does not treat a pipe paragraph without a separator as a table", () => {
    const blocks = parseMarkdownBlocks("this | has | pipes");
    expect(blocks[0]!.kind).toBe("paragraph");
  });

  it("parses blockquotes and horizontal rules", () => {
    const blocks = parseMarkdownBlocks("> quoted\n\n---");
    expect(blocks[0]).toEqual({ kind: "quote", text: "quoted" });
    expect(blocks[1]).toEqual({ kind: "hr" });
  });

  it("groups plain lines into a paragraph", () => {
    const blocks = parseMarkdownBlocks("line one\nline two");
    expect(blocks).toEqual([{ kind: "paragraph", text: "line one line two" }]);
  });
});
