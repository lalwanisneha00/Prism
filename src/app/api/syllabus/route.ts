import { z } from "zod";
import { errorCopy } from "@/lib/lessonEvents";
import { chainFor, generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { parseJsonReply } from "@/lib/jsonReply";
import { AiSyllabusSchema, chunkText, mergeSyllabi, SYLLABUS_SYSTEM } from "@/lib/university/ai";
import type { UniSyllabus } from "@/lib/university/parse";

/*
 * POST { text } → { ok, syllabus }: the structure of a university syllabus (semesters, subjects,
 * units, topics), read by the AI for files the plain reader cannot follow. Nothing is stored here;
 * the student reviews the result before anything is applied.
 */

export const maxDuration = 60;

const MAX_CHARS = 60_000;
const RequestSchema = z.object({ text: z.string().trim().min(40).max(MAX_CHARS) });

type Reply = { ok: true; syllabus: UniSyllabus } | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return reply(
      { ok: false, kind: "invalid-request", message: "Paste or upload a syllabus first." },
      400,
    );
  }
  if (process.env.LLM_PROVIDER === "fake") {
    // The test AI: one subject per "Unit" heading group is not guessed; it returns a fixed shape.
    return reply({
      ok: true,
      syllabus: {
        subjects: [
          {
            name: "Test subject (test AI)",
            semester: 1,
            units: [{ name: "Unit 1", topics: ["Waves", "Optics", "Heat", "Sound"] }],
          },
        ],
      },
    });
  }
  try {
    const parts: UniSyllabus[] = [];
    for (const chunk of chunkText(body.data.text).slice(0, 6)) {
      const raw = await generateJsonWithFallback(chainFor(req, providersFromEnv), {
        system: SYLLABUS_SYSTEM,
        prompt: `Syllabus text:\n\n${chunk}`,
        temperature: 0,
        signal: req.signal,
      });
      const parsed = AiSyllabusSchema.safeParse(parseJsonReply(raw));
      if (!parsed.success) throw new LlmError("bad-response", "syllabus had the wrong shape");
      parts.push(parsed.data);
    }
    return reply({ ok: true, syllabus: mergeSyllabi(parts) });
  } catch (err) {
    const error =
      err instanceof LlmError
        ? err
        : new LlmError(err instanceof SyntaxError ? "bad-response" : "unavailable", String(err));
    console.error("[api/syllabus]", error.kind, error.message.slice(0, 200));
    const status = error.kind === "rate-limit" ? 429 : 503;
    return reply({ ok: false, kind: error.kind, message: errorCopy[error.kind].message }, status);
  }
}
