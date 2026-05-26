import { describe, expect, it } from "vitest";
import { redactSecrets } from "./logRedaction.js";

describe("redactSecrets", () => {
  it("redacts common API key patterns", () => {
    const input = "key=sk-abcdefghijklmnopqrstuvwxyz token ghp_1234567890123456789012345678901234";
    const output = redactSecrets(input);

    expect(output).not.toContain("sk-abcdefghijklmnopqrstuvwxyz");
    expect(output).not.toContain("ghp_1234567890123456789012345678901234");
    expect(output).toContain("[REDACTED]");
  });

  it("redacts bearer tokens and env-style secrets", () => {
    const input = "Authorization: Bearer abc.def.ghi OPENAI_API_KEY=secret-value";
    const output = redactSecrets(input);

    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("secret-value");
  });
});
