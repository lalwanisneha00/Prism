import { z } from "zod";
import { errorCopy } from "@/lib/lessonEvents";
import { chainFor, generateJsonWithFallback, LlmError, providersFromEnv } from "@/lib/llm";
import { fetchWikipediaExtract, searchWikipedia, trimExtract } from "@/lib/grounding/wikipedia";
import { parseJsonReply } from "@/lib/jsonReply";
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
import {
  fakeVerify,
  isRecall,
  verifyProblem,
  verifyPrompt,
  VerifyReplySchema,
  type VerifyCheck,
} from "@/lib/mock/verify";
import { findSubject, type Subject } from "@/lib/subjects";
import { CustomSubjectPayloadSchema, toSubject } from "@/lib/custom/customSubject";
import { activeChapters } from "@/lib/syllabusFix/active";

/*
 * POST one batch of a mock paper's questions with their answer key → { ok, questions, fixed }.
 * The browser plans the paper (sections, each question's type, marks and topic) and asks for it a
 * few questions at a time, so each request stays well inside the time limit and the student sees
 * the paper fill in. Every question is checked here before it is sent back (scope, marks,
 * numericals, marking scheme, command word, maths that renders, no copied past questions), then
 * a second examiner re-solves each one without the key (code compares the two). Failed ones are
 * rewritten; a batch that can't be fixed in time is refused, never shown.
 */

export const maxDuration = 60;

/** Stop asking for rewrites after this long, so the reply beats the 60-second limit. */
const REWRITE_DEADLINE_MS = 30_000;
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
  const topicInfo = new Map(
    subject
      ? activeChapters(subject).flatMap((c) =>
          c.topics.map((t) => [t.id, { id: t.id, name: t.name, unit: c.name }] as const),
        )
      : [],
  );
  const scope = new Set(data.scope);
  if (
    !subject ||
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
  const fake = process.env.LLM_PROVIDER === "fake";
  const bare = slotTopics.filter((t) => !data.facts[t.id]?.length);
  const reference =
    !fake && bare.length > 0 && data.material.length === 0
      ? await referenceFor(subject, bare, req.signal).catch(() => [])
      : [];

  /** One call checks the whole batch; a reply that can't be read is asked for once more. */
  async function verify(questions: readonly PaperQuestion[]): Promise<Map<string, VerifyCheck>> {
    const items = questions.map((q) => ({ ...q, slot: q.id }));
    for (let i = 0; i < 2; i++) {
      let raw: unknown;
      if (fake) raw = fakeVerify(items);
      else {
        const { system, prompt } = verifyPrompt(items);
        const text = await generateJsonWithFallback(chainFor(req, providersFromEnv), {
          system,
          prompt,
          temperature: 0,
          signal: req.signal,
        });
        raw = parseJsonReply(text);
      }
      const parsed = VerifyReplySchema.safeParse(raw);
      if (parsed.success) return new Map(parsed.data.checks.map((c) => [c.slot, c]));
    }
    return new Map();
  }

  const started = Date.now();
  const done = new Map<string, PaperQuestion>();
  let fixed = 0;
  let problems: SlotProblem[] = [];
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0 && Date.now() - started > REWRITE_DEADLINE_MS) break;
      const todo: PlannedSection = {
        ...section,
        slots: section.slots.filter((s) => !done.has(s.id)),
      };
      let raw: unknown[];
      if (fake) raw = fakeSection(todo);
      else {
        const { system, prompt } = sectionPrompt({
          subjectName: subject.name,
          section: todo,
          topics: [...scope].map((t) => topicInfo.get(t)!).slice(0, 120),
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
          problems: attempt > 0 ? problems : undefined,
        });
        const text = await generateJsonWithFallback(chainFor(req, providersFromEnv), {
          system,
          prompt,
          temperature: attempt === 0 ? 0.5 : 0.3,
          signal: req.signal,
        });
        const parsed = SectionReplySchema.safeParse(parseJsonReply(text));
        raw = parsed.success ? parsed.data.questions : [];
      }
      const checked = checkSection(todo, raw, { ...ctx, recallMarks: recallLeft() });
      fixed += checked.fixed;
      problems = checked.problems;
      // The second examiner: every question that passed the rules is solved again without the key.
      const passed = [...checked.ok.values()];
      const verdicts = passed.length ? await verify(passed) : new Map<string, VerifyCheck>();
      for (const q of passed) {
        const problem = verifyProblem({ ...q, slot: q.id }, verdicts.get(q.id), evaluateCheck);
        if (problem) problems.push({ slot: q.id, reason: problem });
        else done.set(q.id, q);
      }
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
        : new LlmError(err instanceof SyntaxError ? "bad-response" : "unavailable", String(err));
    console.error("[api/mock-test]", error.message);
    const status = error.kind === "rate-limit" ? 429 : error.kind === "bad-response" ? 422 : 503;
    return reply({ ok: false, kind: error.kind, message: errorCopy[error.kind].message }, status);
  }
}
