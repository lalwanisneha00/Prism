import { z } from "zod";
import { findLevel } from "@/data/levels";
import { errorCopy } from "@/lib/lessonEvents";
import { generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import {
  checkQuestions,
  fakeMockTest,
  mockPrompt,
  MockTestSchema,
  type MockTest,
} from "@/lib/mock/mockTest";
import { evaluateCheck } from "@/lib/safeMath";
import { findChapter, findSubject } from "@/lib/subjects";
import { CustomSubjectPayloadSchema, toSubject } from "@/lib/custom/customSubject";

/*
 * POST { subject, chapter, topics, level, minutes, facts, pyqs? } → { ok, test, dropped }.
 * A chapter mock test (V2.5 · Step 5). "facts" are the revision points of the chapter's
 * fact-checked topic lessons (sent by the browser, checked here for shape and size).
 */

export const maxDuration = 60;

const RequestSchema = z.object({
  subject: z.string().max(80),
  /** One chapter (a chapter lesson) or several (V3 · Step 3). */
  chapters: z.array(z.string().max(80)).min(1).max(12),
  topics: z.array(z.string().max(80)).min(1).max(40),
  level: z.string().max(40),
  minutes: z.union([z.literal(15), z.literal(30), z.literal(45)]),
  facts: z.array(z.string().trim().min(1).max(400)).min(1).max(80),
  pyqs: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
  custom: CustomSubjectPayloadSchema.optional(),
});

type Reply =
  { ok: true; test: MockTest; dropped: number } | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) => Response.json(body, { status });

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  const custom = body.success && body.data.custom ? toSubject(body.data.custom) : undefined;
  const subject = body.success
    ? custom?.id === body.data.subject
      ? custom
      : findSubject(body.data.subject)
    : undefined;
  const chapters =
    body.success && subject ? body.data.chapters.map((id) => findChapter(subject, id)) : [];
  const level = body.success ? findLevel(body.data.level) : undefined;
  const topics = chapters
    .flatMap((c) => c?.topics ?? [])
    .filter((t) => body.success && body.data.topics.includes(t.id));
  if (
    !body.success ||
    !subject ||
    !level ||
    chapters.length === 0 ||
    chapters.some((c) => !c) ||
    topics.length !== new Set(body.data.topics).size
  ) {
    return reply({ ok: false, kind: "invalid-request", message: "That request isn't valid." }, 400);
  }
  const chapter = { name: chapters.map((c) => c!.name).join(", ") };
  const ids = new Set(topics.map((t) => t.id));

  if (process.env.LLM_PROVIDER === "fake") {
    const test = checkQuestions(fakeMockTest(topics, body.data.facts), ids, evaluateCheck);
    return reply({ ok: true, test: test.test, dropped: test.dropped.length });
  }

  const { system, prompt } = mockPrompt({
    subject,
    chapter,
    topics,
    level,
    minutes: body.data.minutes,
    facts: body.data.facts,
    pyqs: body.data.pyqs,
  });
  try {
    let result: { test: MockTest; dropped: string[] } | null = null;
    let problems = "";
    for (let attempt = 0; attempt < 2 && !result; attempt++) {
      const raw = await generateJsonWithFallback(providersFromEnv(), {
        system,
        prompt: problems ? `${prompt}\n\nYour last reply was not valid: ${problems}` : prompt,
        temperature: 0.4,
        signal: req.signal,
      });
      const parsed = MockTestSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        problems = parsed.error.issues
          .slice(0, 8)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        continue;
      }
      const kept = checkQuestions(parsed.data, ids, evaluateCheck);
      // Too few safe questions left: ask once more, naming what went wrong.
      if (kept.test.questions.length < 3) {
        problems = kept.dropped.join("; ");
        continue;
      }
      result = kept;
    }
    if (!result) throw new LlmError("bad-response", `mock test: ${problems}`);
    if (result.dropped.length) console.warn("[api/mock-test] dropped:", result.dropped.join(" | "));
    return reply({ ok: true, test: result.test, dropped: result.dropped.length });
  } catch (err) {
    const error =
      err instanceof LlmError
        ? err
        : new LlmError(err instanceof SyntaxError ? "bad-response" : "unavailable", String(err));
    console.error("[api/mock-test]", error.message);
    const status = error.kind === "rate-limit" ? 429 : 503;
    return reply({ ok: false, kind: error.kind, message: errorCopy[error.kind].message }, status);
  }
}
