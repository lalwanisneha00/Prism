import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeProvider } from "@/lib/llm/fake";
import {
  generateJsonWithFallback,
  providersFromEnv,
  resetBusyProviders,
} from "@/lib/llm/providers";
import { LlmError, type LlmProvider } from "@/lib/llm/types";

const env = (vars: Record<string, string>) => vars as unknown as NodeJS.ProcessEnv;

function failing(kind: LlmError["kind"], name = "Failing"): LlmProvider & { calls: number } {
  const p = {
    name,
    calls: 0,
    generateJson: async () => {
      p.calls++;
      throw new LlmError(kind, kind);
    },
  };
  return p;
}

beforeEach(() => {
  resetBusyProviders();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("provider chain", () => {
  it("sends a request with pictures only to providers that read images", async () => {
    const textOnly = failing("unavailable", "TextOnly");
    const reader = new FakeProvider(() => '{"text":"read"}');
    const images = [{ mimeType: "image/png", base64: "AAAA" }];
    const reply = await generateJsonWithFallback([textOnly, reader], {
      system: "s",
      prompt: "p",
      images,
    });
    expect(reply).toBe('{"text":"read"}');
    expect(textOnly.calls).toBe(0);
    await expect(
      generateJsonWithFallback([textOnly], { system: "s", prompt: "p", images }),
    ).rejects.toMatchObject({ kind: "not-configured" });
  });

  it("tries the next provider after a blocked reply, without resting the first one", async () => {
    const blocking = failing("blocked", "Blocking");
    const backup = new FakeProvider(() => "{}");
    expect(await generateJsonWithFallback([blocking, backup], { system: "", prompt: "" })).toBe(
      "{}",
    );
    await generateJsonWithFallback([blocking, backup], { system: "", prompt: "" });
    expect(blocking.calls).toBe(2); // asked first again: it isn't marked busy
  });

  it("falls back to the next provider when the first is overloaded", async () => {
    const text = await generateJsonWithFallback(
      [failing("unavailable"), new FakeProvider(() => "{}")],
      { system: "", prompt: "" },
    );
    expect(text).toBe("{}");
  });

  it("skips a provider that was busy in the last minute, then tries it again later", async () => {
    const busy = failing("unavailable", "Busy");
    const backup = new FakeProvider(() => "{}");
    let clock = 0;
    const now = () => clock;

    await generateJsonWithFallback([busy, backup], { system: "", prompt: "" }, now);
    clock = 30_000;
    await generateJsonWithFallback([busy, backup], { system: "", prompt: "" }, now);
    expect(busy.calls).toBe(1); // skipped the second time

    clock = 61_000 + 30_000;
    await generateJsonWithFallback([busy, backup], { system: "", prompt: "" }, now);
    expect(busy.calls).toBe(2); // tried again after the rest period
  });

  it("rests a provider for as long as it asked, e.g. until its daily quota resets", async () => {
    const exhausted = {
      name: "Exhausted",
      calls: 0,
      async generateJson(): Promise<string> {
        this.calls++;
        throw new LlmError("rate-limit", "daily quota", 7 * 3600_000);
      },
    };
    const backup = new FakeProvider(() => "{}");
    let clock = 0;
    const now = () => clock;
    await generateJsonWithFallback([exhausted, backup], { system: "", prompt: "" }, now);
    clock = 2 * 3600_000; // two hours later: still resting
    await generateJsonWithFallback([exhausted, backup], { system: "", prompt: "" }, now);
    expect(exhausted.calls).toBe(1);
  });

  it("still uses a resting provider if nothing else is left", async () => {
    let clock = 0;
    const flaky = {
      name: "Flaky",
      tries: 0,
      async generateJson() {
        if (this.tries++ === 0) throw new LlmError("unavailable", "busy");
        return "{}";
      },
    };
    await expect(
      generateJsonWithFallback([flaky], { system: "", prompt: "" }, () => clock),
    ).rejects.toBeInstanceOf(LlmError);
    clock = 1000;
    expect(await generateJsonWithFallback([flaky], { system: "", prompt: "" }, () => clock)).toBe(
      "{}",
    );
  });

  it("explains when no provider is configured", async () => {
    await expect(generateJsonWithFallback([], { system: "", prompt: "" })).rejects.toSatisfy(
      (e) => e instanceof LlmError && e.kind === "not-configured",
    );
  });

  it("reports 'busy' when every provider fails and one of them was only rate-limited", async () => {
    // Waiting helps with a rate limit; the backup's own error would look like a dead end.
    await expect(
      generateJsonWithFallback([failing("rate-limit", "A"), failing("unavailable", "B")], {
        system: "",
        prompt: "",
      }),
    ).rejects.toSatisfy((e) => e instanceof LlmError && e.kind === "rate-limit");
  });

  it("surfaces the last error when every provider fails for other reasons", async () => {
    await expect(
      generateJsonWithFallback([failing("blocked", "A"), failing("unavailable", "B")], {
        system: "",
        prompt: "",
      }),
    ).rejects.toSatisfy((e) => e instanceof LlmError && e.kind === "unavailable");
  });

  it("builds the main Gemini model, its backups, then Groq, Mistral and OpenRouter", () => {
    const names = providersFromEnv(
      env({
        GEMINI_API_KEY: "a",
        GROQ_API_KEY: "b",
        MISTRAL_API_KEY: "c",
        OPENROUTER_API_KEY: "d",
      }),
    ).map((p) => p.name);
    expect(names).toEqual([
      "Gemini (gemini-flash-latest)",
      "Gemini (gemini-flash-lite-latest)",
      "Gemini (gemini-3.1-flash-lite)",
      "Groq",
      "Mistral",
      "OpenRouter",
    ]);
    expect(providersFromEnv(env({}))).toEqual([]);
  });

  it("lets .env.local choose the models", () => {
    const names = providersFromEnv(
      env({ GEMINI_API_KEY: "a", GEMINI_MODEL: "m1", GEMINI_FALLBACK_MODELS: "m2, m1" }),
    ).map((p) => p.name);
    expect(names).toEqual(["Gemini (m1)", "Gemini (m2)"]);
  });
});
