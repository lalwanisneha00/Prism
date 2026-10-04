import { z } from "zod";
import { errorCopy } from "@/lib/lessonEvents";
import { chainFor, generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { FakeProvider } from "@/lib/llm/fake";
import type { LlmProvider } from "@/lib/llm/types";

/*
 * "Read with AI" for one picture of notes (V2.5 · Step 2). Only used when the student asks,
 * one page at a time, because it spends the free AI quota. The picture is sent to the AI
 * provider and nowhere else; nothing is stored.
 */

export const maxDuration = 60;

/** About 3 MB of picture, plenty for a 1600-pixel JPEG. */
const MAX_BASE64 = 4_000_000;

const RequestSchema = z.object({
  image: z
    .string()
    .min(100)
    .max(MAX_BASE64)
    .regex(/^[A-Za-z0-9+/=]+$/),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
const ReplySchema = z.object({ text: z.string().max(20_000) });

const SYSTEM = `You copy the text of a student's study material from a picture (a photo of handwritten notes, a whiteboard, a scanned page or a slide).
Rules:
- Copy only what is written in the picture, in reading order. Never add, explain or correct content.
- Keep line breaks between separate lines or bullet points.
- Write maths in plain text (x^2, sqrt(x), a/b) and Greek letters as symbols (ε₀, λ).
- If a word is unreadable, write [?]. If there is no readable text, return an empty string.
Reply with JSON only: {"text": "..."}`;

function providers(): LlmProvider[] {
  if (process.env.LLM_PROVIDER === "fake") {
    return [
      new FakeProvider(() =>
        JSON.stringify({ text: "Gauss's law: flux = Q / ε₀ (read by the test AI)" }),
      ),
    ];
  }
  return providersFromEnv();
}

type Reply = { ok: true; text: string } | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) => Response.json(body, { status });

/** POST { image: base64, mimeType } → { ok, text }. */
export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return reply(
      { ok: false, kind: "invalid-request", message: "That picture can't be sent." },
      400,
    );
  }
  try {
    const raw = await generateJsonWithFallback(chainFor(req, providers), {
      system: SYSTEM,
      prompt: "Copy all the text in this picture.",
      temperature: 0,
      images: [{ mimeType: body.data.mimeType, base64: body.data.image }],
      signal: req.signal,
    });
    const parsed = ReplySchema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw new LlmError("bad-response", "The reply had the wrong shape.");
    return reply({ ok: true, text: parsed.data.text });
  } catch (err) {
    const error =
      err instanceof LlmError
        ? err
        : new LlmError(err instanceof SyntaxError ? "bad-response" : "unavailable", String(err));
    console.error("[api/read-image]", error.message);
    const status = error.kind === "rate-limit" ? 429 : 503;
    return reply({ ok: false, kind: error.kind, message: errorCopy[error.kind].message }, status);
  }
}
