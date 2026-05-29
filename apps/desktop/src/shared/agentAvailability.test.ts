import { describe, expect, it } from "vitest";
import { buildExecutableCandidates } from "./agentAvailability.js";

describe("buildExecutableCandidates", () => {
  it("returns nothing for an empty command", () => {
    expect(buildExecutableCandidates("", { path: "C:\\bin" }, "win32")).toEqual([]);
    expect(buildExecutableCandidates("   ", { path: "/usr/bin" }, "linux")).toEqual([]);
  });

  it("expands PATH directories with PATHEXT on Windows", () => {
    const candidates = buildExecutableCandidates(
      "codex",
      { path: "C:\\bin;C:\\tools", pathExt: ".EXE;.CMD" },
      "win32"
    );

    expect(candidates).toEqual([
      "C:\\bin\\codex",
      "C:\\bin\\codex.EXE",
      "C:\\bin\\codex.CMD",
      "C:\\tools\\codex",
      "C:\\tools\\codex.EXE",
      "C:\\tools\\codex.CMD"
    ]);
  });

  it("joins PATH directories with colon on posix without extensions", () => {
    const candidates = buildExecutableCandidates(
      "claude",
      { path: "/usr/bin:/usr/local/bin" },
      "linux"
    );

    expect(candidates).toEqual(["/usr/bin/claude", "/usr/local/bin/claude"]);
  });

  it("probes an explicit path directly instead of scanning PATH", () => {
    const posix = buildExecutableCandidates("/opt/agents/codex", { path: "/usr/bin" }, "linux");
    expect(posix).toEqual(["/opt/agents/codex"]);

    const win = buildExecutableCandidates(
      "C:\\tools\\codex.exe",
      { path: "C:\\bin", pathExt: ".EXE" },
      "win32"
    );
    expect(win).toEqual(["C:\\tools\\codex.exe"]);
  });

  it("falls back to default PATHEXT when none provided on Windows", () => {
    const candidates = buildExecutableCandidates("kiro", { path: "C:\\bin" }, "win32");
    expect(candidates).toContain("C:\\bin\\kiro.EXE");
    expect(candidates).toContain("C:\\bin\\kiro.CMD");
  });
});
