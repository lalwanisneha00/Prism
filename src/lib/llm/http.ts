import { LlmError } from "@/lib/llm/types";

/** Turns an HTTP error from any provider into an LlmError the UI understands. */
export async function errorFromResponse(provider: string, res: Response): Promise<LlmError> {
  const body = await res.text().catch(() => "");
  const detail = body.slice(0, 300);
  if (res.status === 429) {
    return new LlmError(
      "rate-limit",
      `${provider}: free quota reached (429). ${detail}`,
      retryAfterMs(res, body),
    );
  }
  if (res.status === 401 || res.status === 403 || /API key/i.test(detail)) {
    return new LlmError("auth", `${provider}: API key rejected (${res.status}). ${detail}`);
  }
  return new LlmError("unavailable", `${provider}: HTTP ${res.status}. ${detail}`);
}

/** fetch() that reports network failures as "unavailable" instead of a raw TypeError. */
export async function safeFetch(provider: string, url: string, init: RequestInit) {
  try {
    return await fetch(url, init);
  } catch (err) {
    if (init.signal?.aborted) throw err;
    throw new LlmError("unavailable", `${provider}: network error (${String(err)})`);
  }
}

/**
 * How long a provider asked us to wait after a 429: Gemini puts it in the body
 * ("retryDelay": "25680s" once a model's daily free quota is used up), others in Retry-After.
 */
export function retryAfterMs(res: Response, body: string): number | undefined {
  const delay = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(body);
  if (delay) return Math.round(Number(delay[1]) * 1000);
  const header = Number(res.headers.get("retry-after"));
  return Number.isFinite(header) && header > 0 ? header * 1000 : undefined;
}
