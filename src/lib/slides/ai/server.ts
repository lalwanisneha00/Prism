import "server-only";
import { errorCopy } from "@/lib/lessonEvents";
import { chainFor, generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { parseJsonReply } from "@/lib/jsonReply";

/*
 * The AI call every deck route shares (deck quality overhaul): each model gets MODEL_WAIT_MS
 * before the next is tried, and the whole request answers inside BUDGET_MS, well before Vercel's
 * 60-second cut-off (the main free model sometimes doesn't answer at all while the "lite" ones do).
 */

export const MODEL_WAIT_MS = 30_000;
export const BUDGET_MS = 52_000;

export type Clock = { left: () => number; signal: (ms?: number) => AbortSignal };

export function clock(req: Request): Clock {
  const started = Date.now();
  const left = () => BUDGET_MS - (Date.now() - started);
  return {
    left,
    signal: (ms = left()) =>
      AbortSignal.any([req.signal, AbortSignal.timeout(Math.max(1_000, ms))]),
  };
}

/** One AI call → its JSON (null when the reply wasn't valid JSON: the caller asks again). */
export async function askJson(
  req: Request,
  c: Clock,
  p: { system: string; prompt: string; temperature: number },
): Promise<unknown> {
  const text = await generateJsonWithFallback(
    chainFor(req, providersFromEnv),
    { ...p, signal: c.signal() },
    Date.now,
    MODEL_WAIT_MS,
  );
  try {
    return parseJsonReply(text);
  } catch {
    return null;
  }
}

/** The error reply every deck route gives (busy AI → 429/503, which the browser retries). */
export function errorReply(err: unknown, c: Clock, where: string): Response {
  const error =
    err instanceof LlmError
      ? err
      : new LlmError("unavailable", c.left() <= 0 ? "out of time" : String(err));
  console.error(`[${where}]`, error.message);
  const status = error.kind === "rate-limit" ? 429 : error.kind === "bad-response" ? 422 : 503;
  return Response.json(
    { ok: false, kind: error.kind, message: errorCopy[error.kind].message },
    { status },
  );
}

export const invalid = () =>
  Response.json(
    { ok: false, kind: "invalid-request", message: "That request isn't valid." },
    { status: 400 },
  );

export const isFake = () => process.env.LLM_PROVIDER === "fake";
