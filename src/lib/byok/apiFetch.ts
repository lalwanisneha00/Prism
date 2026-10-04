import { KEY_HEADERS } from "@/lib/byok/catalogue";
import { getActiveKey } from "@/lib/byok/store";

/*
 * fetch() for our own AI routes. When the student has chosen a key of their own, it travels in
 * request headers (over HTTPS) for this one request; the server uses it and forgets it.
 * `sharedKeyForNextRequest()` skips it once, for "Retry with Prism's shared key".
 */

let sharedNext = false;

/** Use the shared key for the very next request only ("Retry with Prism's shared key"). */
export function sharedKeyForNextRequest() {
  sharedNext = true;
}

export async function keyHeaders(): Promise<Record<string, string>> {
  if (sharedNext) {
    sharedNext = false;
    return {};
  }
  try {
    const active = await getActiveKey();
    if (!active) return {};
    return {
      [KEY_HEADERS.provider]: active.id,
      [KEY_HEADERS.model]: active.model,
      [KEY_HEADERS.key]: active.key,
    };
  } catch {
    return {}; // storage blocked: the shared key is used
  }
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const extra = await keyHeaders();
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return fetch(input, { ...init, headers });
}
