import { errorFromResponse, safeFetch } from "@/lib/llm/http";
import { readSseData } from "@/lib/llm/sse";
import type { GenerateOptions, LlmProvider } from "@/lib/llm/types";

type GroqChunk = { choices?: { delta?: { content?: string } }[] };

/** Groq's OpenAI-compatible API (free tier), used as a fallback when Gemini is busy. */
export class GroqProvider implements LlmProvider {
  readonly name = "Groq";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateJson({ system, prompt, temperature = 0.4, onText, signal }: GenerateOptions) {
    const res = await safeFetch(this.name, "https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        temperature,
        stream: true,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok || !res.body) throw await errorFromResponse(this.name, res);

    let text = "";
    for await (const data of readSseData(res.body)) {
      if (data === "[DONE]") break;
      const piece = (JSON.parse(data) as GroqChunk).choices?.[0]?.delta?.content ?? "";
      if (piece) {
        text += piece;
        onText?.(piece);
      }
    }
    return text;
  }
}
