import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiProvider } from "@/lib/llm/gemini";
import { GroqProvider } from "@/lib/llm/groq";
import { LlmError } from "@/lib/llm/types";

function sse(lines: string[], status = 200) {
  const body = lines.map((l) => `data: ${l}\n\n`).join("");
  return new Response(body, { status, headers: { "content-type": "text/event-stream" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("GeminiProvider", () => {
  it("sends the key in a header, asks for JSON and joins streamed text", async () => {
    const fetchMock = vi.fn(async () =>
      sse([
        JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"a":' }] } }] }),
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "1}" }] }, finishReason: "STOP" }],
        }),
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    const chunks: string[] = [];
    const text = await new GeminiProvider("KEY", "gemini-test").generateJson({
      system: "sys",
      prompt: "hi",
      onText: (c) => chunks.push(c),
    });
    expect(text).toBe('{"a":1}');
    expect(chunks).toEqual(['{"a":', "1}"]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("models/gemini-test:streamGenerateContent?alt=sse");
    expect(url).not.toContain("KEY");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("KEY");
    expect(JSON.parse(String(init.body)).generationConfig.responseMimeType).toBe(
      "application/json",
    );
  });

  it("reports a used-up free quota as a rate limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("quota", { status: 429 })),
    );
    await expect(
      new GeminiProvider("KEY", "m").generateJson({ system: "", prompt: "" }),
    ).rejects.toSatisfy((e) => e instanceof LlmError && e.kind === "rate-limit");
  });

  it("reports a rejected key as an auth problem", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("API key not valid", { status: 400 })),
    );
    await expect(
      new GeminiProvider("BAD", "m").generateJson({ system: "", prompt: "" }),
    ).rejects.toSatisfy((e) => e instanceof LlmError && e.kind === "auth");
  });

  it("reports no internet as unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    await expect(
      new GeminiProvider("KEY", "m").generateJson({ system: "", prompt: "" }),
    ).rejects.toSatisfy((e) => e instanceof LlmError && e.kind === "unavailable");
  });
});

describe("GroqProvider", () => {
  it("streams OpenAI-style deltas until [DONE]", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sse([
          JSON.stringify({ choices: [{ delta: { content: '{"ok"' } }] }),
          JSON.stringify({ choices: [{ delta: { content: ":true}" } }] }),
          "[DONE]",
        ]),
      ),
    );
    const text = await new GroqProvider("KEY", "llama").generateJson({ system: "", prompt: "" });
    expect(text).toBe('{"ok":true}');
  });
});
