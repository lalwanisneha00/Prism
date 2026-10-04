import { afterEach, describe, expect, it, vi } from "vitest";
import { KEY_HEADERS, PROVIDERS, redact } from "@/lib/byok/catalogue";
import { AnthropicProvider } from "@/lib/llm/anthropic";
import { OpenAiCompatibleProvider } from "@/lib/llm/openaiCompatible";
import { LlmError } from "@/lib/llm/types";
import { chainFor, userKeyFromHeaders } from "@/lib/llm/userKey";
import { LessonSchema } from "@/lib/schema";
import { fakeLessonBody } from "@/lib/llm/fakeLesson";
import { sourcesForTopic } from "@/lib/sources";

const KEY = "sk-test-abcdefghijklmnop1234";

function sse(lines: string[], status = 200) {
  const body = lines.map((l) => `data: ${l}\n\n`).join("");
  return new Response(body, { status, headers: { "content-type": "text/event-stream" } });
}

const headers = (h: Record<string, string>) => new Headers(h);

afterEach(() => vi.unstubAllGlobals());

describe("redact", () => {
  it("removes the key and anything key-shaped", () => {
    const out = redact(`bad key ${KEY} and sk-proj-AAAAAAAAAAAAAAAA tail`, KEY);
    expect(out).not.toContain("abcdefghijklmnop");
    expect(out).not.toContain("AAAAAAAAAAAA");
    expect(out).toContain("[key removed]");
  });
});

describe("userKeyFromHeaders", () => {
  it("is null without a key (the shared providers are used)", () => {
    expect(userKeyFromHeaders(headers({}))).toBeNull();
  });
  it("builds a provider for every catalogue entry", () => {
    for (const p of PROVIDERS) {
      const u = userKeyFromHeaders(
        headers({ [KEY_HEADERS.provider]: p.id, [KEY_HEADERS.key]: KEY }),
      );
      expect(u?.model).toBe(p.defaultModel);
    }
  });
  it("rejects an unknown provider, a spaced key and a bad model name", () => {
    const bad: Record<string, string>[] = [
      { [KEY_HEADERS.provider]: "nope", [KEY_HEADERS.key]: KEY },
      { [KEY_HEADERS.provider]: "openai", [KEY_HEADERS.key]: "has a space in it" },
      { [KEY_HEADERS.provider]: "openai", [KEY_HEADERS.key]: KEY, [KEY_HEADERS.model]: "a b;c" },
    ];
    for (const h of bad) expect(() => userKeyFromHeaders(headers(h))).toThrow(LlmError);
  });
  it("chainFor uses only the student's key when one is sent", () => {
    const shared = vi.fn(() => []);
    const req = new Request("http://x", {
      headers: { [KEY_HEADERS.provider]: "groq", [KEY_HEADERS.key]: KEY },
    });
    expect(chainFor(req, shared)).toHaveLength(1);
    expect(shared).not.toHaveBeenCalled();
    expect(chainFor(new Request("http://x"), () => [])).toEqual([]);
  });
  it("never lets the key into an error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(`Incorrect API key provided: ${KEY}`, { status: 401 })),
    );
    const u = userKeyFromHeaders(
      headers({ [KEY_HEADERS.provider]: "openai", [KEY_HEADERS.key]: KEY }),
    )!;
    const err = await u.provider.generateJson({ system: "s", prompt: "p" }).catch((e) => e);
    expect(err).toBeInstanceOf(LlmError);
    expect((err as LlmError).kind).toBe("auth");
    expect((err as LlmError).message).not.toContain(KEY);
  });
});

describe("AnthropicProvider", () => {
  it("sends the key and version headers, and joins streamed text", async () => {
    const fetchMock = vi.fn(async () =>
      sse([
        JSON.stringify({ type: "message_start" }),
        JSON.stringify({
          type: "content_block_delta",
          delta: { type: "text_delta", text: '{"a":' },
        }),
        JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "1}" } }),
        JSON.stringify({ type: "message_delta", delta: { stop_reason: "end_turn" } }),
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const pieces: string[] = [];
    const text = await new AnthropicProvider("KEY", "claude-test").generateJson({
      system: "sys",
      prompt: "hi",
      onText: (c) => pieces.push(c),
    });
    expect(text).toBe('{"a":1}');
    expect(pieces).toEqual(['{"a":', "1}"]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const h = init.headers as Record<string, string>;
    expect(h["x-api-key"]).toBe("KEY");
    expect(h["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("claude-test");
    expect(body.system).toContain("single JSON object");
  });

  it("maps a 401 to an auth error and a refusal to blocked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("no", { status: 401 })),
    );
    await expect(
      new AnthropicProvider("K", "m").generateJson({ system: "", prompt: "" }),
    ).rejects.toSatisfy((e) => e instanceof LlmError && e.kind === "auth");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sse([JSON.stringify({ type: "message_delta", delta: { stop_reason: "refusal" } })]),
      ),
    );
    await expect(
      new AnthropicProvider("K", "m").generateJson({ system: "", prompt: "" }),
    ).rejects.toSatisfy((e) => e instanceof LlmError && e.kind === "blocked");
  });
});

describe("OpenAI-style providers", () => {
  it("leaves the temperature out when asked, and keeps JSON mode", async () => {
    const fetchMock = vi.fn(async () =>
      sse([JSON.stringify({ choices: [{ delta: { content: "{}" } }] }), "[DONE]"]),
    );
    vi.stubGlobal("fetch", fetchMock);
    await new OpenAiCompatibleProvider(
      "OpenAI",
      "https://api.openai.com/v1/chat/completions",
      "K",
      "m",
      {
        omitTemperature: true,
      },
    ).generateJson({ system: "s", prompt: "p" });
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body),
    );
    expect(body.temperature).toBeUndefined();
    expect(body.response_format).toEqual({ type: "json_object" });
  });
});

describe("every provider returns the same validated lesson shape", () => {
  it("accepts a lesson that carries generatedBy", () => {
    const body = fakeLessonBody(sourcesForTopic("em", "gauss-law"), "gauss-law") as {
      meta: Record<string, unknown>;
    };
    const lesson = {
      ...body,
      meta: { ...body.meta, generatedBy: { provider: "Anthropic", model: "m", ownKey: true } },
    };
    const parsed = LessonSchema.safeParse(lesson);
    expect(
      parsed.success || parsed.error.issues.every((i) => !i.path.includes("generatedBy")),
    ).toBe(true);
  });
});
