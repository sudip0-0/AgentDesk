import { describe, expect, it } from "vitest";
import { diffLineTokens, tokenizeLine } from "./diffHighlight.js";

describe("tokenizeLine", () => {
  it("preserves all characters across word/space/punctuation tokens", () => {
    const tokens = tokenizeLine("const x = 1;");
    expect(tokens.join("")).toBe("const x = 1;");
  });
});

describe("diffLineTokens", () => {
  it("marks only the changed token between two similar lines", () => {
    const { removed, addedSegments } = diffLineTokens("const x = 1;", "const x = 2;");

    expect(removed.map((s) => s.text).join("")).toBe("const x = 1;");
    expect(addedSegments.map((s) => s.text).join("")).toBe("const x = 2;");

    const changedRemoved = removed.filter((s) => s.changed).map((s) => s.text.trim());
    const changedAdded = addedSegments.filter((s) => s.changed).map((s) => s.text.trim());
    expect(changedRemoved).toContain("1");
    expect(changedAdded).toContain("2");
  });

  it("marks everything changed when there is no overlap", () => {
    const { removed, addedSegments } = diffLineTokens("alpha", "bravo");
    expect(removed.every((s) => s.changed)).toBe(true);
    expect(addedSegments.every((s) => s.changed)).toBe(true);
  });

  it("marks nothing changed for identical lines", () => {
    const { removed, addedSegments } = diffLineTokens("same line", "same line");
    expect(removed.some((s) => s.changed)).toBe(false);
    expect(addedSegments.some((s) => s.changed)).toBe(false);
  });

  it("reconstructs both original lines exactly", () => {
    const removedLine = "  foo(bar, baz)";
    const addedLine = "  foo(bar, qux, baz)";
    const { removed, addedSegments } = diffLineTokens(removedLine, addedLine);
    expect(removed.map((s) => s.text).join("")).toBe(removedLine);
    expect(addedSegments.map((s) => s.text).join("")).toBe(addedLine);
  });
});
