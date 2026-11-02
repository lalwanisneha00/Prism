import { z } from "zod";
import { errorCopy } from "@/lib/lessonEvents";
import { chainFor, generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { parseJsonReply } from "@/lib/jsonReply";
import { boundaryFor } from "@/lib/mock/boundary";
import { checklistFor, checklistText } from "@/lib/mock/checklist";
import {
  EXAMINE_LIMIT,
  fakeReview,
  ReviewReplySchema,
  reviewPrompt,
  verdictFor,
  type Verdict,
} from "@/lib/mock/examiner";
import { PaperQuestionSchema } from "@/lib/mock/paper";
import { evaluateCheck } from "@/lib/safeMath";
import { activeChapters } from "@/lib/syllabusFix/active";
import { findSubject } from "@/lib/subjects";
import { CustomSubjectPayloadSchema, toSubject } from "@/lib/custom/customSubject";

/*
 * POST a written mock paper (or the questions rewritten since the last check) → { ok, results }:
 * one verdict per question, { id, pass, issues, fix }. ONE AI call for the whole paper: a strict
 * examiner who solves each question first and looks for errors (syllabus, correctness, ambiguity,
 * repeats, command word vs marks, the answer, code and numbers), with the subject's checklist
 * when it has one. Code then re-checks the MCQ option and the calculation the examiner gives.
 * A reply that can't be read is asked for again; a question without a verdict fails.
 */

export const maxDuration = 60;

/** One model's time before the next is tried (a whole paper is a longer read than one batch). */
const MODEL_WAIT_MS = 35_000;
/** The whole request must answer inside this, well before Vercel's 60-second cut-off. */
const BUDGET_MS = 52_000;
/** A second try (unreadable reply) only starts with this much time left. */
const RETRY_NEEDS_MS = 15_000;

const id = z.string().trim().min(1).max(80);
const RequestSchema = z.object({
  subject: id,
  custom: CustomSubjectPayloadSchema.optional(),
  scope: z.array(id).min(1).max(400),
  syllabus: z.string().trim().max(4000).optional(),
  questions: z.array(PaperQuestionSchema).min(1).max(EXAMINE_LIMIT),
  /** The rest of the paper's questions (for the repeat check only). */
  accepted: z.array(z.string().trim().max(300)).max(60).default([]),
});

type Reply = { ok: true; results: Verdict[] } | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) => Response.json(body, { status });

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return reply({ ok: false, kind: "invalid-request", message: "That request isn't valid." }, 400);
  const data = body.data;
  const custom = data.custom ? toSubject(data.custom) : undefined;
  const subject = custom?.id === data.subject ? custom : findSubject(data.subject);
  if (!subject)
    return reply({ ok: false, kind: "invalid-request", message: "That request isn't valid." }, 400);
  const boundary = boundaryFor(subject, data.scope);
  if (data.scope.some((t) => !boundary.all.has(t)))
    return reply({ ok: false, kind: "invalid-request", message: "That request isn't valid." }, 400);

  const checklist = checklistFor({
    name: subject.name,
    topicNames: activeChapters(subject).flatMap((c) => [c.name, ...c.topics.map((t) => t.name)]),
  });
  const items = data.questions;
  const { system, prompt } = reviewPrompt({
    course: boundary.course,
    topics: boundary.inside.map((t) => `${t.name} (${t.unit})`),
    outside: boundary.outside,
    syllabus: data.syllabus,
    checklist: checklist ? checklistText(checklist) : undefined,
    questions: items,
    accepted: data.accepted,
  });

  const started = Date.now();
  const left = () => BUDGET_MS - (Date.now() - started);
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0 && left() < RETRY_NEEDS_MS) break;
      let raw: unknown;
      if (process.env.LLM_PROVIDER === "fake") raw = fakeReview(items);
      else {
        const text = await generateJsonWithFallback(
          chainFor(req, providersFromEnv),
          {
            system,
            prompt,
            temperature: 0,
            signal: AbortSignal.any([req.signal, AbortSignal.timeout(Math.max(1_000, left()))]),
          },
          Date.now,
          MODEL_WAIT_MS,
        );
        try {
          raw = parseJsonReply(text);
        } catch {
          console.warn("[api/mock-test/verify] reply wasn't valid JSON; asking again");
          continue;
        }
      }
      const parsed = ReviewReplySchema.safeParse(raw);
      if (!parsed.success) {
        console.warn("[api/mock-test/verify] reply didn't match the schema; asking again");
        continue;
      }
      const byId = new Map(parsed.data.results.map((r) => [r.id, r]));
      const results = items.map((q) => verdictFor(q, byId.get(q.id), evaluateCheck));
      const failed = results.filter((r) => !r.pass);
      if (failed.length)
        console.info(
          "[api/mock-test/verify] rejected:",
          failed.map((f) => `${f.id}: ${f.issues.join("; ")}`).join(" | "),
        );
      return reply({ ok: true, results });
    }
    throw new LlmError("bad-response", "the examiner's reply couldn't be read");
  } catch (err) {
    const error =
      err instanceof LlmError
        ? err
        : new LlmError("unavailable", left() <= 0 ? "out of time" : String(err));
    console.error("[api/mock-test/verify]", error.message);
    const status = error.kind === "rate-limit" ? 429 : error.kind === "bad-response" ? 422 : 503;
    return reply({ ok: false, kind: error.kind, message: errorCopy[error.kind].message }, status);
  }
}
