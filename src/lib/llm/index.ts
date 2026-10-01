import "server-only";
import { GeminiProvider } from "@/lib/llm/gemini";
import { GroqProvider } from "@/lib/llm/groq";
import { LlmError, type GenerateOptions, type LlmProvider } from "@/lib/llm/types";

export { LlmError } from "@/lib/llm/types";
export type { LlmProvider } from "@/lib/llm/types";

/**
 * The providers to try, in order, built from environment variables.
 * Keys are read here on the server only; they never reach the browser.
 */
export function providersFromEnv(env: NodeJS.ProcessEnv = process.env): LlmProvider[] {
  const providers: LlmProvider[] = [];
  if (env.GEMINI_API_KEY) {
    providers.push(
      new GeminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL || "gemini-flash-latest"),
    );
  }
  if (env.GROQ_API_KEY) {
    providers.push(new GroqProvider(env.GROQ_API_KEY, env.GROQ_MODEL || "llama-3.3-70b-versatile"));
  }
  return providers;
}

/** Errors worth trying the next provider for (a different provider may still work). */
const fallbackKinds = new Set(["rate-limit", "unavailable", "auth"]);

/** Tries each provider in turn; moves on when one is busy, down or misconfigured. */
export async function generateJsonWithFallback(
  providers: LlmProvider[],
  options: GenerateOptions,
): Promise<string> {
  if (providers.length === 0) {
    throw new LlmError(
      "not-configured",
      "No AI provider is set up. Add GEMINI_API_KEY to .env.local.",
    );
  }
  let lastError: unknown;
  for (const provider of providers) {
    try {
      return await provider.generateJson(options);
    } catch (err) {
      if (options.signal?.aborted) throw err;
      lastError = err;
      if (!(err instanceof LlmError) || !fallbackKinds.has(err.kind)) throw err;
    }
  }
  throw lastError;
}
