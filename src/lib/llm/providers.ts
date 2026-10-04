/*
 * Provider set-up and fallback. Import through "@/lib/llm" in app code (which adds the
 * server-only guard); scripts that run outside Next.js, like the eval, import this directly.
 */
import { GeminiProvider } from "@/lib/llm/gemini";
import { GroqProvider } from "@/lib/llm/groq";
import { mistral, openRouter } from "@/lib/llm/openaiCompatible";
import { LlmError, type GenerateOptions, type LlmProvider } from "@/lib/llm/types";

export { LlmError } from "@/lib/llm/types";
export type { LlmProvider } from "@/lib/llm/types";

/**
 * Backup Gemini models, tried in order when the main one is overloaded (HTTP 503) or out of
 * quota. On the free tier the big "flash" models are often busy while the "lite" ones answer.
 */
export const DEFAULT_GEMINI_FALLBACKS = ["gemini-flash-lite-latest", "gemini-3.1-flash-lite"];

/**
 * The providers to try, in order, built from environment variables.
 * Keys are read here on the server only; they never reach the browser.
 */
export function providersFromEnv(env: NodeJS.ProcessEnv = process.env): LlmProvider[] {
  const providers: LlmProvider[] = [];
  if (env.GEMINI_API_KEY) {
    const fallbacks = env.GEMINI_FALLBACK_MODELS
      ? env.GEMINI_FALLBACK_MODELS.split(",").map((m) => m.trim())
      : DEFAULT_GEMINI_FALLBACKS;
    const models = [...new Set([env.GEMINI_MODEL || "gemini-flash-latest", ...fallbacks])].filter(
      Boolean,
    );
    for (const model of models) providers.push(new GeminiProvider(env.GEMINI_API_KEY, model));
  }
  if (env.GROQ_API_KEY) {
    providers.push(new GroqProvider(env.GROQ_API_KEY, env.GROQ_MODEL || undefined));
  }
  if (env.MISTRAL_API_KEY) {
    providers.push(mistral(env.MISTRAL_API_KEY, env.MISTRAL_MODEL || undefined));
  }
  if (env.OPENROUTER_API_KEY) {
    providers.push(openRouter(env.OPENROUTER_API_KEY, env.OPENROUTER_MODEL || undefined));
  }
  return providers;
}

/** Errors worth trying the next provider for (a different provider may still work). */
const fallbackKinds = new Set(["rate-limit", "unavailable", "auth", "blocked"]);

/** How long to skip a provider after it says it is busy, so later calls don't wait on it. */
const BUSY_MS = 60_000;
const busyUntil = new Map<string, number>();

/** For tests: forget which providers were busy. */
export function resetBusyProviders() {
  busyUntil.clear();
}

/**
 * Tries each provider in turn; moves on when one is busy, down or misconfigured.
 * Providers that were busy in the last minute go to the back of the queue.
 */
/** Longest wait for one provider's whole reply; a normal lesson streams in 20–60 s. */
export const PROVIDER_TIMEOUT_MS = 180_000;

export async function generateJsonWithFallback(
  providers: LlmProvider[],
  options: GenerateOptions,
  now: () => number = Date.now,
  timeoutMs: number = PROVIDER_TIMEOUT_MS,
  onUsed?: (provider: LlmProvider) => void,
): Promise<string> {
  if (providers.length === 0) {
    throw new LlmError(
      "not-configured",
      "No AI provider is set up. Add GEMINI_API_KEY to .env.local.",
    );
  }
  // A request with pictures can only go to providers that read images.
  const able = options.images?.length ? providers.filter((p) => p.supportsImages) : providers;
  if (able.length === 0) {
    throw new LlmError("not-configured", "No AI provider that can read images is set up.");
  }
  const t = now();
  const ready = able.filter((p) => (busyUntil.get(p.name) ?? 0) <= t);
  const resting = able.filter((p) => (busyUntil.get(p.name) ?? 0) > t);

  let lastError: unknown;
  let rateLimited: LlmError | undefined;
  for (const provider of [...ready, ...resting]) {
    // A stalled connection or stream must not hang the lesson forever: give up on this
    // provider after timeoutMs and try the next one.
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    try {
      const text = await provider.generateJson({ ...options, signal });
      busyUntil.delete(provider.name);
      onUsed?.(provider);
      return text;
    } catch (caught) {
      if (options.signal?.aborted) throw caught;
      const err = timeout.aborted
        ? new LlmError("unavailable", `${provider.name}: no reply within ${timeoutMs / 1000} s`)
        : caught;
      lastError = err;
      if (!(err instanceof LlmError) || !fallbackKinds.has(err.kind)) throw err;
      if (err.kind === "rate-limit") rateLimited ??= err;
      // A blocked reply is about this request, not the provider, so it is not marked busy.
      // Rest it for a minute, or as long as it asked (a model whose daily free quota is used
      // up says how long until the reset, so later calls don't waste time on it).
      if (err.kind !== "auth" && err.kind !== "blocked")
        busyUntil.set(provider.name, now() + Math.max(BUSY_MS, err.retryAfterMs ?? 0));
      console.warn(`[llm] ${provider.name} unavailable (${err.kind}); trying the next one.`);
    }
  }
  // If any provider only said "busy", report that: waiting a minute will help, whereas a later
  // backup's network error or retired model would wrongly look like a dead end.
  throw rateLimited ?? lastError;
}
