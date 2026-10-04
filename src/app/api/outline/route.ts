import { z } from "zod";
import { OutlineSchema, outlinePrompt } from "@/lib/custom/outline";
import { errorCopy } from "@/lib/lessonEvents";
import { generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";

/*
 * POST { name, excerpts, pyqs? } → { ok, chapters }: a proposed outline for a student's own
 * subject, from short excerpts of their material (V3 · Step 4). One AI call; the student
 * edits the result. Nothing is stored here.
 */

export const maxDuration = 60;

const RequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  excerpts: z.array(z.string().max(400)).min(1).max(80),
  pyqs: z.array(z.string().max(500)).max(30).default([]),
});

type Reply =
  | { ok: true; chapters: z.infer<typeof OutlineSchema>["chapters"] }
  | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) => Response.json(body, { status });

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return reply({ ok: false, kind: "invalid-request", message: "That request isn't valid." }, 400);
  }
  if (process.env.LLM_PROVIDER === "fake") {
    // The test AI: one unit made of the excerpts' part names.
    const topics = [
      ...new Set(body.data.excerpts.map((e) => /^\[[^,]+, ([^\]]+)\]/.exec(e)?.[1] ?? "Topic")),
    ].slice(0, 12);
    return reply({ ok: true, chapters: [{ name: `${body.data.name}: unit 1 (test AI)`, topics }] });
  }
  const { system, prompt } = outlinePrompt(body.data.name, body.data.excerpts, body.data.pyqs);
  try {
    const raw = await generateJsonWithFallback(providersFromEnv(), {
      system,
      prompt,
      temperature: 0.2,
      signal: req.signal,
    });
    const parsed = OutlineSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw new LlmError("bad-response", "outline had the wrong shape");
    return reply({ ok: true, chapters: parsed.data.chapters });
  } catch (err) {
    const error =
      err instanceof LlmError
        ? err
        : new LlmError(err instanceof SyntaxError ? "bad-response" : "unavailable", String(err));
    console.error("[api/outline]", error.message);
    const status = error.kind === "rate-limit" ? 429 : 503;
    return reply({ ok: false, kind: error.kind, message: errorCopy[error.kind].message }, status);
  }
}
