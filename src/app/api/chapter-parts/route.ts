import { z } from "zod";
import {
  ChapterPartsSchema,
  chapterPrompt,
  fakeParts,
  partsKey,
  readParts,
  writeParts,
  type ChapterParts,
} from "@/lib/chapter/parts";
import { validateChapterRequest } from "@/lib/chapter/request";
import { CustomSubjectPayloadSchema, toSubject } from "@/lib/custom/customSubject";
import { getAdmin } from "@/lib/firebase/admin";
import { errorCopy } from "@/lib/lessonEvents";
import { chainFor, generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { adminLibraryStore } from "@/lib/library/adminStore";
import type { LibraryStore } from "@/lib/library/sharedLibrary";

/*
 * POST { subject, chapter, level, minutes, order: [{ id, minutes }] } → { ok, parts, cached }.
 * The chapter lesson's introduction, bridges and wrap-up (V2.5 · Step 4). Checked against the
 * shared library first; new ones are written there (they never contain the student's notes).
 */

export const maxDuration = 60;

const RequestSchema = z.object({
  subject: z.string().max(80),
  chapter: z.string().max(80),
  level: z.string().max(40),
  minutes: z.number().int(),
  order: z
    .array(z.object({ id: z.string().max(80), minutes: z.number().int().min(0).max(240) }))
    .min(1)
    .max(40),
  /** A student's own subject (V3 · Step 4). Its parts are never put in the shared library. */
  custom: CustomSubjectPayloadSchema.optional(),
});

function sharedLibrary(): LibraryStore | null {
  if (process.env.LLM_PROVIDER === "fake") return null;
  const admin = getAdmin();
  return admin ? adminLibraryStore(admin.db) : null;
}

type Reply =
  { ok: true; parts: ChapterParts; cached: boolean } | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) => Response.json(body, { status });

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  const checked = body.success
    ? validateChapterRequest(
        {
          subject: body.data.subject,
          chapter: body.data.chapter,
          level: body.data.level,
          minutes: String(body.data.minutes),
          topics: body.data.order.map((o) => o.id).join(","),
        },
        body.data.custom ? [toSubject(body.data.custom)] : [],
      )
    : null;
  if (!body.success || !checked?.ok) {
    return reply({ ok: false, kind: "invalid-request", message: "That request isn't valid." }, 400);
  }
  const { subject, chapter, level } = checked.request;
  // The lesson order is the student's (their plan), so keep it rather than chapter order.
  const order = body.data.order
    .map((o) => ({ topic: chapter.topics.find((t) => t.id === o.id)!, minutes: o.minutes }))
    .filter((o) => o.topic && o.minutes > 0);
  if (order.length === 0) {
    return reply({ ok: false, kind: "invalid-request", message: "No topics left to teach." }, 400);
  }
  const key = partsKey({
    subject: subject.id,
    chapter: chapter.id,
    level: level.slug,
    minutes: body.data.minutes,
    topics: order.map((o) => o.topic.id),
  });

  if (process.env.LLM_PROVIDER === "fake") {
    return reply({
      ok: true,
      parts: fakeParts(
        chapter,
        order.map((o) => o.topic),
      ),
      cached: false,
    });
  }

  const library = body.data.custom ? null : sharedLibrary();
  if (library) {
    const stored = await readParts(library, key).catch(() => null);
    if (stored) return reply({ ok: true, parts: stored, cached: true });
  }

  const { system, prompt } = chapterPrompt({ subject, chapter, level, topics: order });
  try {
    let parts: ChapterParts | null = null;
    let problems = "";
    // Up to two tries: a reply with the wrong shape is sent back once with the problems.
    for (let attempt = 0; attempt < 2 && !parts; attempt++) {
      const raw = await generateJsonWithFallback(chainFor(req, providersFromEnv), {
        system,
        prompt: problems ? `${prompt}\n\nYour last reply was not valid: ${problems}` : prompt,
        temperature: 0.5,
        signal: req.signal,
      });
      const parsed = ChapterPartsSchema.safeParse(JSON.parse(raw));
      if (parsed.success) parts = parsed.data;
      else
        problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    }
    if (!parts) throw new LlmError("bad-response", `chapter parts: ${problems}`);
    if (library) {
      await writeParts(library, key, parts, {
        subject: subject.id,
        chapter: chapter.id,
        level: level.slug,
        minutes: body.data.minutes,
        title: chapter.name,
      }).catch((err: unknown) =>
        console.warn("[api/chapter-parts] library write failed:", String(err)),
      );
    }
    return reply({ ok: true, parts, cached: false });
  } catch (err) {
    const error =
      err instanceof LlmError
        ? err
        : new LlmError(err instanceof SyntaxError ? "bad-response" : "unavailable", String(err));
    console.error("[api/chapter-parts]", error.message);
    const status = error.kind === "rate-limit" ? 429 : 503;
    return reply({ ok: false, kind: error.kind, message: errorCopy[error.kind].message }, status);
  }
}
