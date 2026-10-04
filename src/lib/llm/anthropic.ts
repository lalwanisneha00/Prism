import { errorFromResponse, safeFetch } from "@/lib/llm/http";
import { readSseData } from "@/lib/llm/sse";
import { LlmError, type GenerateOptions, type LlmProvider } from "@/lib/llm/types";

type AnthropicEvent = {
  type?: string;
  delta?: { type?: string; text?: string; stop_reason?: string };
  error?: { message?: string };
};

/** Longest reply we ask for: a lesson is a few thousand tokens; this leaves plenty of room. */
const MAX_TOKENS = 16_000;

/** Anthropic's Messages API (Claude), with the student's own key. */
export class AnthropicProvider implements LlmProvider {
  readonly supportsImages = true;

  get name() {
    return `Anthropic (${this.model})`;
  }

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateJson({
    system,
    prompt,
    temperature = 0.4,
    onText,
    signal,
    images = [],
  }: GenerateOptions) {
    const res = await safeFetch(this.name, "https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: MAX_TOKENS,
        temperature,
        stream: true,
        // Claude has no "JSON mode": the instruction goes in the system prompt, and the
        // caller extracts the first balanced JSON object from whatever comes back.
        system: `${system}\n\nReply with a single JSON object and nothing else: no code fences, no commentary.`,
        messages: [
          {
            role: "user",
            content: [
              ...images.map((i) => ({
                type: "image",
                source: { type: "base64", media_type: i.mimeType, data: i.base64 },
              })),
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });
    if (!res.ok || !res.body) throw await errorFromResponse(this.name, res);

    let text = "";
    let stopReason = "";
    for await (const data of readSseData(res.body)) {
      const event = JSON.parse(data) as AnthropicEvent;
      if (event.type === "error") {
        throw new LlmError("unavailable", `Anthropic: ${event.error?.message ?? "stream error"}`);
      }
      if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
        const piece = event.delta.text ?? "";
        text += piece;
        if (piece) onText?.(piece);
      }
      if (event.type === "message_delta" && event.delta?.stop_reason) {
        stopReason = event.delta.stop_reason;
      }
    }
    if (stopReason === "refusal") {
      throw new LlmError("blocked", "Anthropic declined to answer this request.");
    }
    return text;
  }
}
