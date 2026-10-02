import { describe, expect, it, vi } from "vitest";
import { FakeProvider } from "@/lib/llm/fake";
import { LlmError, type LlmProvider } from "@/lib/llm/types";

vi.mock("server-only", () => ({}));
const { generateJsonWithFallback, providersFromEnv } = await import("@/lib/llm/providers");

const failing = (kind: LlmError["kind"]): LlmProvider => ({
  name: "Failing",
  generateJson: async () => {
    throw new LlmError(kind, kind);
  },
});

describe("provider chain", () => {
  it("falls back to the next provider when the first is rate-limited", async () => {
    const text = await generateJsonWithFallback(
      [failing("rate-limit"), new FakeProvider(() => "{}")],
      { system: "", prompt: "" },
    );
    expect(text).toBe("{}");
  });

  it("explains when no provider is configured", async () => {
    await expect(generateJsonWithFallback([], { system: "", prompt: "" })).rejects.toSatisfy(
      (e) => e instanceof LlmError && e.kind === "not-configured",
    );
  });

  it("surfaces the last error when every provider fails", async () => {
    await expect(
      generateJsonWithFallback([failing("rate-limit"), failing("unavailable")], {
        system: "",
        prompt: "",
      }),
    ).rejects.toSatisfy((e) => e instanceof LlmError && e.kind === "unavailable");
  });

  it("builds Gemini first, then Groq, from environment variables", () => {
    const names = providersFromEnv({
      GEMINI_API_KEY: "a",
      GROQ_API_KEY: "b",
    } as unknown as NodeJS.ProcessEnv).map((p) => p.name);
    expect(names).toEqual(["Gemini", "Groq"]);
    expect(providersFromEnv({} as unknown as NodeJS.ProcessEnv)).toEqual([]);
  });
});
