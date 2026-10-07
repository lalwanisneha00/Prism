import { KEY_HEADERS, redact } from "@/lib/byok/catalogue";
import { chainFor, generateJsonWithFallback, hasUserKey, LlmError } from "@/lib/llm";

export const maxDuration = 30;

export type TestKeyResponse = { ok: true } | { ok: false; kind: string; message: string };

// A few tests a minute per visitor is plenty, and keeps this route from being used to hammer
// a provider. (In memory: each server instance counts for itself.)
const recent = new Map<string, number[]>();
const LIMIT = 8;

function tooMany(ip: string, now = Date.now()): boolean {
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(ip, hits);
  return hits.length > LIMIT;
}

const reply = (body: TestKeyResponse, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

const COPY: Record<string, string> = {
  auth: "The provider rejected this key. Check that it is copied in full and still switched on.",
  "rate-limit": "The key works but is out of quota or rate-limited right now.",
  unavailable: "The provider didn't answer. Try again in a moment.",
  blocked: "The provider declined the test request.",
  "bad-response": "The provider answered, but not in the format Prism needs.",
};

/**
 * POST (key in headers) → { ok } after one tiny request. The key is used for this call only:
 * it is not stored or logged, and any error text has it removed.
 */
export async function POST(req: Request) {
  if (!hasUserKey(req)) return reply({ ok: false, kind: "auth", message: "No key was sent." }, 400);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (tooMany(ip)) {
    return reply({ ok: false, kind: "rate-limit", message: "Too many tests. Wait a minute." }, 429);
  }
  const key = req.headers.get(KEY_HEADERS.key) ?? "";
  // LLM_PROVIDER=fake (automated tests): a key containing "bad" is rejected, any other works.
  if (process.env.LLM_PROVIDER === "fake") {
    return key.includes("bad")
      ? reply({ ok: false, kind: "auth", message: COPY.auth })
      : reply({ ok: true });
  }
  try {
    const chain = chainFor(req, () => []);
    const text = await generateJsonWithFallback(
      chain,
      {
        system: 'You are a connection test. Reply with exactly this JSON object: {"ok":true}',
        prompt: "Reply now.",
        temperature: 0,
        signal: AbortSignal.timeout(25_000),
      },
      undefined,
      25_000,
    );
    return /\{[\s\S]*"ok"[\s\S]*\}/.test(text)
      ? reply({ ok: true })
      : reply({ ok: false, kind: "bad-response", message: COPY["bad-response"] });
  } catch (err) {
    const error = err instanceof LlmError ? err : new LlmError("unavailable", String(err));
    console.warn("[api/test-key]", error.kind, redact(error.message, key));
    // The provider's own reason (the key removed, cut short) so a student can see what went wrong.
    const reason = redact(error.message, key).replace(/s+/g, " ").slice(0, 220);
    // 503 / "high demand": the provider is busy, which says nothing against the key.
    if (
      error.kind === "unavailable" &&
      /HTTP 50[023]|high demand|overloaded/i.test(error.message)
    ) {
      return reply({
        ok: false,
        kind: "busy",
        message:
          "Google is very busy right now (high demand), so it could not answer the test. Your key is probably fine: click Save key, then try again in a few minutes, or pick a different model (for example Flash-Lite).",
      });
    }
    const base = COPY[error.kind] ?? COPY.unavailable;
    return reply({
      ok: false,
      kind: error.kind,
      message: error.kind === "unavailable" && reason ? `${base} Details: ${reason}` : base,
    });
  }
}
