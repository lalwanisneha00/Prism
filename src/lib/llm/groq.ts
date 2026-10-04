import { OpenAiCompatibleProvider } from "@/lib/llm/openaiCompatible";

/** Groq's free tier. `llama-3.3-70b-versatile` was withdrawn in 2026; gpt-oss-120b replaced it. */
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

/** Groq's OpenAI-compatible API (free tier), used as a fallback when Gemini is busy. */
export class GroqProvider extends OpenAiCompatibleProvider {
  constructor(apiKey: string, model: string = DEFAULT_GROQ_MODEL) {
    super("Groq", "https://api.groq.com/openai/v1/chat/completions", apiKey, model);
  }
}
