import { errorFromResponse, safeFetch } from "@/lib/llm/http";
import { readSseData } from "@/lib/llm/sse";
import type { GenerateOptions, LlmProvider } from "@/lib/llm/types";

type ChatChunk = { choices?: { delta?: { content?: string } }[] };

/**
 * Any provider with an OpenAI-style "chat completions" endpoint (Groq, Mistral, OpenRouter).
 * All three are used on their free tiers, as fallbacks when Gemini is busy.
 */
export class OpenAiCompatibleProvider implements LlmProvider {
  constructor(
    readonly name: string,
    private readonly url: string,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateJson({ system, prompt, temperature = 0.4, onText, signal }: GenerateOptions) {
    const res = await safeFetch(this.name, this.url, {
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
      const piece = (JSON.parse(data) as ChatChunk).choices?.[0]?.delta?.content ?? "";
      if (piece) {
        text += piece;
        onText?.(piece);
      }
    }
    return text;
  }
}

/** Mistral's free "Experiment" plan allows every model, at a low request rate. */
export const DEFAULT_MISTRAL_MODEL = "mistral-large-latest";
/** One of OpenRouter's free (":free") models; the list changes, so it can be set in .env.local. */
export const DEFAULT_OPENROUTER_MODEL = "google/gemma-4-31b-it:free";

export const mistral = (key: string, model = DEFAULT_MISTRAL_MODEL) =>
  new OpenAiCompatibleProvider("Mistral", "https://api.mistral.ai/v1/chat/completions", key, model);
export const openRouter = (key: string, model = DEFAULT_OPENROUTER_MODEL) =>
  new OpenAiCompatibleProvider(
    "OpenRouter",
    "https://openrouter.ai/api/v1/chat/completions",
    key,
    model,
  );
