import { z } from "zod";
import { errorCopy } from "@/lib/lessonEvents";
import { chainFor, generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { fetchWikipediaExtract, searchWikipedia, trimExtract } from "@/lib/grounding/wikipedia";
import { parseJsonReply } from "@/lib/jsonReply";
import { boundaryFor, type BoundaryTopic } from "@/lib/mock/boundary";
import {
  checkSection,
  fakeSection,
  SectionReplySchema,
  sectionPrompt,
  type PaperQuestion,
  type PlannedSection,
  type SlotProblem,
} from "@/lib/mock/paper";
import { QUESTION_TYPES } from "@/lib/mock/pattern";
import { evaluateCheck } from "@/lib/safeMath";
import { isRecall } from "@/lib/mock/verify";
import { findSubject, type Subject } from "@/lib/subjects";
import { CustomSubjectPayloadSchema, toSubject } from "@/lib/custom/customSubject";

/*
 * POST one batch of a mock paper's questions with their answer key → { ok, questions, fixed }.
 * The browser plans the paper (sections, each question's type, marks and topic) and asks for it a
 * few questions at a time, so each request stays well inside the time limit and the student sees
 * the paper fill in. The writer gets the syllabus boundary (chosen topics, and the course's other
 * topics as "not in this paper"). Every question is checked here by code before it is sent back
 * (relevance, scope, marks, numericals, marking scheme, command word, maths that renders, no
 * copied past questions); failed ones are rewritten. The whole paper then goes to the examiner
 * (/api/mock-test/verify) once. The same route rewrites the questions the examiner rejects
 * (`feedback`).
 */

export const maxDuration = 60;

/**
 * How long one AI model gets before the next one is tried. The main free model sometimes doesn't
 * reply at all to these prompts while the "lite" backups answer in seconds; the shared 3-minute
 * wait (meant for streamed lessons) would use up the whole 60-second limit on the first model.
 */
const MODEL_WAIT_MS = 20_000;
/** The whole request must answer inside this, well before Vercel's 60-second cut-off. */
const BUDGET_MS = 50_000;
/** A rewrite is only started with at least this much time left. */
const REWRITE_NEEDS_MS = 22_000;
const id = z.string().trim().min(1).max(80);

const RequestSchema = z.object({
  subject: id,
  custom: CustomSubjectPayloadSchema.optional(),
  section: z.object({
    id: z.string().max(20),
    name: z.string().trim().min(1).max(80),
    instructions: z.string().trim().max(200).optional(),
    attempt: z.int().positive().max(40).optional(),
    slots: z
      .array(
        z.object({
          id: z.string().max(20),
          type: z.enum(QUESTION_TYPES),
          marks: z.number().positive().max(100),
          topic: id,
        }),
      )
      .min(1)
      .max(6),
  }),
  /** Every topic the student chose (the strict scope). */
  scope: z.array(id).min(1).max(400),
  facts: z.record(id, z.array(z.string().trim().min(1).max(400)).max(8)).default({}),
  material: z.array(z.string().trim().min(1).max(800)).max(8).default([]),
  pyqs: z.array(z.string().trim().min(1).max(500)).max(12).default([]),
  pyqRepeat: z.boolean().default(false),
  pyqRepeatMarks: z.number().min(0).max(100).default(0),
  difficulty: z.enum(["easy", "mixed", "hard"]).default("mixed"),
  styleNote: z.string().trim().max(300).default("Follow a standard Indian university exam style."),
  avoid: z.array(z.string().trim().max(200)).max(40).default([]),
  /** Marks plain recall questions may still take in the paper (the warm-up share). */
  recallMarks: z.number().min(0).max(300).optional(),
  /** Marks prerequisite (relevance B) questions may still take in the paper. */
  prereqMarks: z.number().min(0).max(300).optional(),
  /** The student's uploaded syllabus for this subject (text), if any. */
  syllabus: z.string().trim().max(4000).optional(),
  /** The examiner's findings on earlier versions of these slots (a rewrite). */
  feedback: z
    .array(
      z.object({
        slot: z.string().max(20),
        issues: z.array(z.string().trim().max(400)).max(10),
        fix: z.string().trim().max(800).optional(),
        previous: z.string().trim().max(1500).optional(),
      }),
    )
    .max(6)
    .default([]),
});

type Reply =
  | { ok: true; questions: PaperQuestion[]; fixed: number }
  | { ok: false; kind: string; message: string };
const reply = (body: Reply, status = 200) => Response.json(body, { status });

/** Wikipedia text for topics with nothing else to go on (best effort, a few topics at most). */
async function referenceFor(
  subject: Subject,
  topics: readonly { id: string; name: string }[],
  signal: AbortSignal,
): Promise<string[]> {
  const found = await Promise.all(
    topics.slice(0, 3).map(async (t) => {
      const [title] = await searchWikipedia(`${t.name} ${subject.name}`, 1, { signal });
      if (!title) return null;
      const text = await fetchWikipediaExtract(title, { signal });
      return typeof text === "string" ? `[${t.id}] ${title}: ${trimExtract(text, 1500)}` : null;
    }),
  );
  return found.filter((t): t is string => t !== null);
}

export async function POST(req: Request) {
  const body = RequestSchema.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return reply({ ok: false, kind: "invalid-request", message: "That request isn't valid." }, 400);
  const data = body.data;
  const custom = data.custom ? toSubject(data.custom) : undefined;
  const subject = custom?.id === data.subject ? custom : findSubject(data.subject);
  const boundary = subject ? boundaryFor(subject, data.scope) : undefined;
  const topicInfo: ReadonlyMap<string, BoundaryTopic> = boundary?.all ?? new Map();
  const scope = new Set(data.scope);
  if (
    !subject ||
    !boundary ||
    data.scope.some((t) => !topicInfo.has(t)) ||
    data.section.slots.some((s) => !scope.has(s.topic))
  )
    return reply({ ok: false, kind: "invalid-request", message: "That request isn't valid." }, 400);

  const section: PlannedSection = data.section;
  const slotTopics = [...new Set(section.slots.map((s) => s.topic))].map((t) => topicInfo.get(t)!);
  const ctx = {
    scope,
    pyqs: data.pyqs,
    pyqRepeatMarks: data.pyqRepeat ? data.pyqRepeatMarks : 0,
    evaluate: evaluateCheck,
  };
  const recallLeft = () =>
    data.recallMarks === undefined
      ? undefined
      : data.recallMarks -
        [...done.values()].filter((q) => isRecall(q.question)).reduce((n, q) => n + q.marks, 0);
  const prereqLeft = () =>
    data.prereqMarks === undefined
      ? undefined
      : data.prereqMarks -
        [...done.values()].filter((q) => q.relevance === "B").reduce((n, q) => n + q.marks, 0);
  const fake = process.env.LLM_PROVIDER === "fake";
  const bare = slotTopics.filter((t) => !data.facts[t.id]?.length);
  const reference =
    !fake && bare.length > 0 && data.material.length === 0
      ? await referenceFor(subject, bare, req.signal).catch(() => [])
      : [];

  const started = Date.now();
  const left = () => BUDGET_MS - (Date.now() - started);
  /** The request's own signal, cut off when the time budget runs out. */
  const deadline = (ms = left()) =>
    AbortSignal.any([req.signal, AbortSignal.timeout(Math.max(1_000, ms))]);

  const done = new Map<string, PaperQuestion>();
  let fixed = 0;
  let problems: SlotProblem[] = [];
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0 && left() < REWRITE_NEEDS_MS) break;
      const todo: PlannedSection = {
        ...section,
        slots: section.slots.filter((s) => !done.has(s.id)),
      };
      let raw: unknown[];
      if (fake) raw = fakeSection(todo);
      else {
        const { system, prompt } = sectionPrompt({
          subjectName: subject.name,
          course: boundary.course,
          section: todo,
          topics: boundary.inside.slice(0, 120),
          outside: boundary.outside,
          syllabus: data.syllabus,
          facts: Object.fromEntries(
            Object.entries(data.facts).filter(([t]) => todo.slots.some((s) => s.topic === t)),
          ),
          material: data.material,
          reference,
          pyqs: data.pyqs,
          pyqRepeat: data.pyqRepeat,
          difficulty: data.difficulty,
          styleNote: data.styleNote,
          avoid: [...data.avoid, ...[...done.values()].map((q) => q.question.slice(0, 200))],
          recallMarks: recallLeft(),
          prereqMarks: prereqLeft(),
          problems: attempt > 0 ? problems : undefined,
          feedback: data.feedback.filter((f) => todo.slots.some((s) => s.id === f.slot)),
        });
        const text = await generateJsonWithFallback(
          chainFor(req, providersFromEnv),
          { system, prompt, temperature: attempt === 0 ? 0.5 : 0.3, signal: deadline() },
          Date.now,
          MODEL_WAIT_MS,
        );
        // Broken JSON counts as no questions: the next attempt rewrites them instead of failing.
        let reply: unknown = null;
        try {
          reply = parseJsonReply(text);
        } catch {
          console.warn("[api/mock-test] reply wasn't valid JSON; asking again");
        }
        const parsed = SectionReplySchema.safeParse(reply);
        raw = parsed.success ? parsed.data.questions : [];
      }
      const checked = checkSection(todo, raw, {
        ...ctx,
        recallMarks: recallLeft(),
        prereqMarks: prereqLeft(),
      });
      fixed += checked.fixed;
      problems = checked.problems;
      for (const q of checked.ok.values()) done.set(q.id, q);
      if (done.size === section.slots.length) break;
    }
    if (done.size < section.slots.length) {
      console.warn(
        "[api/mock-test] unfixed:",
        problems.map((p) => `${p.slot}: ${p.reason}`).join(" | "),
      );
      throw new LlmError("bad-response", "questions failed the checks");
    }
    return reply({ ok: true, questions: section.slots.map((s) => done.get(s.id)!), fixed });
  } catch (err) {
    const error =
      err instanceof LlmError
        ? err
        : new LlmError(
            err instanceof SyntaxError ? "bad-response" : "unavailable",
            left() <= 0 ? "out of time" : String(err),
          );
    console.error("[api/mock-test]", error.message);
    const status = error.kind === "rate-limit" ? 429 : error.kind === "bad-response" ? 422 : 503;
    return reply({ ok: false, kind: error.kind, message: errorCopy[error.kind].message }, status);
  }
}
