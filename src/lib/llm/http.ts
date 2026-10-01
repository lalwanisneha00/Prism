import { LlmError } from "@/lib/llm/types";

/** Turns an HTTP error from any provider into an LlmError the UI understands. */
export async function errorFromResponse(provider: string, res: Response): Promise<LlmError> {
  const detail = (await res.text().catch(() => "")).slice(0, 300);
  if (res.status === 429) {
    return new LlmError("rate-limit", `${provider}: free quota reached (429). ${detail}`);
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
