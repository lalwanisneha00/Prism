import { z } from "zod";
import { errorCopy } from "@/lib/lessonEvents";
import { chainFor, generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { parseJsonReply } from "@/lib/jsonReply";
import {
  chunkPaper,
  MAX_PAPER_CHARS,
  PatternExtractionSchema,
  patternFromExtractions,
  patternPrompt,
  rulePattern,
  type PatternExtraction,
} from "@/lib/mock/readPattern";
import type { PaperPattern } from "@/lib/mock/pattern";

/*
 * POST { text } → { ok, pattern }: the structure of one uploaded paper (mock test overhaul).
 * Called once per upload; the browser keeps the result with the upload, so no AI call is spent
 * on it again. Long papers are read in chunks and joined by plain code. When the AI is busy the
 * browser falls back to the free rule-based reader.
 */

export const maxDuration = 60;

/** Stop starting new chunks after this long (the reply must beat the 60-second limit). */
const DEADLINE_MS = 40_000;

const RequestSchema = z.object({
  text: z.string().trim().min(20).max(MAX_PAPER_CHARS),
});

type Reply = { ok: true; pattern: PaperPattern } | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) => Response.json(body, { status });

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return reply(
      { ok: false, kind: "invalid-request", message: "That paper has no text to read." },
      400,
    );
  const now = Date.now();
  if (process.env.LLM_PROVIDER === "fake") {
    const pattern = rulePattern(body.data.text, now);
    return pattern
      ? reply({ ok: true, pattern: { ...pattern, source: "ai" } })
      : reply(
          { ok: false, kind: "bad-response", message: "No questions found in that paper." },
          422,
        );
  }
  const chunks = chunkPaper(body.data.text);
  const parts: PatternExtraction[] = [];
  try {
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0 && Date.now() - now > DEADLINE_MS) break;
      const { system, prompt } = patternPrompt(chunks[i], i + 1, chunks.length);
      const text = await generateJsonWithFallback(chainFor(req, providersFromEnv), {
        system,
        prompt,
        temperature: 0.1,
        signal: req.signal,
      });
      const parsed = PatternExtractionSchema.safeParse(parseJsonReply(text));
      if (parsed.success) parts.push(parsed.data);
    }
    const pattern = patternFromExtractions(parts, now);
    if (!pattern) throw new LlmError("bad-response", "no pattern in the AI's reading");
    return reply({ ok: true, pattern });
  } catch (err) {
    const error =
      err instanceof LlmError
        ? err
        : new LlmError(err instanceof SyntaxError ? "bad-response" : "unavailable", String(err));
    console.error("[api/mock-test/pattern]", error.message);
    const status = error.kind === "rate-limit" ? 429 : error.kind === "bad-response" ? 422 : 503;
    return reply({ ok: false, kind: error.kind, message: errorCopy[error.kind].message }, status);
  }
}
