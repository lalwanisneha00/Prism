import { errorFromResponse, safeFetch } from "@/lib/llm/http";
import { readSseData } from "@/lib/llm/sse";
import { LlmError, type GenerateOptions, type LlmProvider } from "@/lib/llm/types";

type GeminiChunk = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  error?: { message?: string };
};

/** Google Gemini via the REST API (free tier key from Google AI Studio). */
export class GeminiProvider implements LlmProvider {
  readonly supportsImages = true;

  get name() {
    return `Gemini (${this.model})`;
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:streamGenerateContent?alt=sse`;
    const res = await safeFetch(this.name, url, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [
          {
            role: "user",
            parts: [
              ...images.map((i) => ({ inline_data: { mime_type: i.mimeType, data: i.base64 } })),
              { text: prompt },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature },
      }),
    });
    if (!res.ok || !res.body) throw await errorFromResponse(this.name, res);

    let text = "";
    let finishReason = "";
    for await (const data of readSseData(res.body)) {
      const chunk = JSON.parse(data) as GeminiChunk;
      if (chunk.error) throw new LlmError("unavailable", `Gemini: ${chunk.error.message}`);
      const candidate = chunk.candidates?.[0];
      finishReason = candidate?.finishReason ?? finishReason;
      const piece = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (piece) {
        text += piece;
        onText?.(piece);
      }
    }
    if (finishReason === "SAFETY" || finishReason === "RECITATION") {
      throw new LlmError("bad-response", `Gemini stopped early (${finishReason}).`);
    }
    return text;
  }
}
