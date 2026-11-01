import { z } from "zod";
import { statesUnit } from "@/lib/units";
import {
  QUESTION_TYPES,
  sectionMarks,
  type BlueprintSection,
  type QuestionType,
  type Slot,
} from "@/lib/mock/pattern";

/*
 * A mock paper (mock test overhaul). Plain code decides the paper's skeleton (sections, each
 * question's type, marks and topic); the AI only writes the questions into those slots. Every
 * question is then checked: right slot, a topic inside the student's choice, a working numerical
 * answer, a full marking scheme, no copied past-paper question. Like an exam board: the setter
 * writes, the moderator checks against the blueprint before anything reaches the student.
 */

const text = z.string().trim().min(1);

export const QUESTION_SOURCES = ["material", "lesson", "pyq-style", "pyq-repeat"] as const;
export type QuestionSource = (typeof QUESTION_SOURCES)[number];
export const sourceLabel: Record<QuestionSource, string> = {
  material: "From your material",
  lesson: "From the lesson",
  "pyq-style": "In past-paper style",
  "pyq-repeat": "PYQ repeat",
};

const SchemePointSchema = z.object({
  point: text.max(300),
  marks: z.number().min(0).max(100),
});

/** One question as the student sees it (and as saved with the result). */
export const PaperQuestionSchema = z.object({
  id: z.string().max(20),
  type: z.enum(QUESTION_TYPES),
  topic: z.string().max(80),
  marks: z.number().positive().max(100),
  /** Markdown with KaTeX maths. */
  question: text.max(2000),
  options: z.array(text.max(300)).min(2).max(6).optional(),
  /** The model answer (for MCQs: the right option, copied exactly). */
  answer: text.max(4000),
  /** The marking scheme: what an examiner gives marks for. Empty for MCQs. */
  scheme: z.array(SchemePointSchema).max(10).default([]),
  source: z.enum(QUESTION_SOURCES),
  check: z
    .object({
      expression: z.string().trim().min(1).max(300),
      answer: z.number(),
      unit: z.string().trim().min(1).max(40).optional(),
    })
    .optional(),
});

export const PaperSectionSchema = z.object({
  id: z.string().max(20),
  name: text.max(80),
  instructions: z.string().trim().max(200).optional(),
  attempt: z.int().positive().max(40).optional(),
  questions: z.array(PaperQuestionSchema).min(1).max(40),
});

export const PaperSchema = z.object({
  title: text.max(200),
  subject: z.string().max(80),
  totalMarks: z.number().positive().max(300),
  minutes: z.int().positive().max(360),
  sections: z.array(PaperSectionSchema).min(1).max(10),
});

export type PaperQuestion = z.infer<typeof PaperQuestionSchema>;
export type PaperSection = z.infer<typeof PaperSectionSchema>;
export type Paper = z.infer<typeof PaperSchema>;

/** A slot with the topic it must test. */
export type TopicSlot = Slot & { topic: string };
export type PlannedSection = Omit<BlueprintSection, "slots"> & { slots: TopicSlot[] };

/**
 * Hands out the slots over the chosen topics. Bigger questions go first, each to the topic with
 * the fewest marks so far for its weight (topics that come up often in past papers weigh more),
 * so every topic gets a question when there are enough, and none gets them all.
 */
export function assignTopics(
  sections: readonly BlueprintSection[],
  topics: readonly string[],
  weights: ReadonlyMap<string, number> = new Map(),
): PlannedSection[] {
  if (topics.length === 0) throw new Error("no topics to assign");
  const given = new Map(topics.map((t) => [t, 0]));
  const order = new Map(topics.map((t, i) => [t, i]));
  const weight = (t: string) => Math.max(1, weights.get(t) ?? 1);
  const all = sections
    .flatMap((s) => s.slots.map((slot) => ({ section: s.id, slot })))
    .sort((a, b) => b.slot.marks - a.slot.marks);
  const picked = new Map<string, string>();
  // Pass 1: every topic once (while there are slots), larger slots to heavier topics.
  const byWeight = [...topics].sort(
    (a, b) => weight(b) - weight(a) || order.get(a)! - order.get(b)!,
  );
  let i = 0;
  for (const { slot } of all) {
    if (i >= byWeight.length) break;
    picked.set(slot.id, byWeight[i]);
    given.set(byWeight[i], slot.marks);
    i++;
  }
  // Pass 2: the rest go to the topic with the fewest marks for its weight.
  for (const { slot } of all) {
    if (picked.has(slot.id)) continue;
    let best = topics[0];
    for (const t of topics) {
      const score = given.get(t)! / weight(t);
      const bestScore = given.get(best)! / weight(best);
      if (score < bestScore || (score === bestScore && order.get(t)! < order.get(best)!)) best = t;
    }
    picked.set(slot.id, best);
    given.set(best, given.get(best)! + slot.marks);
  }
  return sections.map((s) => ({
    ...s,
    slots: s.slots.map((slot) => ({ ...slot, topic: picked.get(slot.id)! })),
  }));
}

const STOP = new Set(
  "the a an of and or to in on for with by is are be as at from that this what which how why explain define describe write short note".split(
    " ",
  ),
);

/** Lower-case content words. */
export function words(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/\$[^$]*\$/g, " ")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** How alike two texts are (0 to 1): shared content words over all content words. */
export function similarity(a: string, b: string): number {
  const x = new Set(words(a));
  const y = new Set(words(b));
  if (x.size === 0 || y.size === 0) return 0;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared++;
  return shared / (x.size + y.size - shared);
}

/** How often each topic comes up in past-paper questions (a topic's name words in a question). */
export function topicWeights(
  topics: readonly { id: string; name: string }[],
  samples: readonly string[],
): Map<string, number> {
  const out = new Map<string, number>();
  const sampleWords = samples.map((s) => new Set(words(s)));
  for (const t of topics) {
    const name = words(t.name);
    if (name.length === 0) continue;
    const hits = sampleWords.filter((w) => {
      const shared = name.filter((n) => w.has(n)).length;
      return shared / name.length >= 0.6;
    }).length;
    if (hits) out.set(t.id, 1 + hits);
  }
  return out;
}

/** One question as the AI writes it into a slot. */
export const SlotAnswerSchema = PaperQuestionSchema.omit({ id: true }).extend({
  slot: z.string().max(20),
});
export const SectionReplySchema = z.object({ questions: z.array(z.unknown()).max(40) });

export type SlotProblem = { slot: string; reason: string };

/** Splits the marks over the scheme's points so they add up to the question's marks exactly. */
export function fitScheme(
  scheme: readonly { point: string; marks: number }[],
  marks: number,
): { point: string; marks: number }[] {
  if (scheme.length === 0) return [];
  const weights = scheme.map((p) => (p.marks > 0 ? p.marks : 1));
  const sum = weights.reduce((a, b) => a + b, 0);
  // Half marks are allowed in schemes; work in halves and hand out the rest by largest remainder.
  const halves = marks * 2;
  const raw = weights.map((w) => (halves * w) / sum);
  const out = raw.map(Math.floor);
  let left = halves - out.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, rest: r - Math.floor(r) }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i)
    .forEach(({ i }) => {
      if (left-- > 0) out[i]++;
    });
  return scheme.map((p, i) => ({ point: p.point, marks: out[i] / 2 }));
}

const SAME_KIND: Record<QuestionType, QuestionType[]> = {
  mcq: ["mcq"],
  short: ["short", "long", "derivation", "diagram"],
  long: ["long", "short", "derivation", "diagram"],
  derivation: ["derivation", "long", "short"],
  diagram: ["diagram", "long", "short"],
  numerical: ["numerical"],
};

export type CheckContext = {
  /** Topic ids the student chose (strict scope). */
  scope: ReadonlySet<string>;
  /** Past-paper questions (style references). */
  pyqs: readonly string[];
  /** Whether labelled "PYQ repeat" questions may be used, and how many marks they may take. */
  pyqRepeatMarks: number;
  evaluate: (expression: string) => number;
};

/** Similar enough to call it the same past question. */
const REPEAT_SIMILARITY = 0.6;
/** Too close to a past question for a "new" question: it must be rewritten. */
const COPY_SIMILARITY = 0.75;

/**
 * Checks the AI's questions for one section against its slots. Small slips are fixed (marks set
 * to the slot's, scheme marks scaled to add up, close types renamed); anything else is a problem
 * to send back for rewriting. Returns the questions that passed, keyed by slot.
 */
export function checkSection(
  planned: PlannedSection,
  raw: readonly unknown[],
  ctx: CheckContext,
): { ok: Map<string, PaperQuestion>; problems: SlotProblem[]; fixed: number } {
  const ok = new Map<string, PaperQuestion>();
  const problems: SlotProblem[] = [];
  let fixed = 0;
  let repeatMarks = 0;
  const slots = new Map(planned.slots.map((s) => [s.id, s]));
  raw.forEach((item, i) => {
    const parsed = SlotAnswerSchema.safeParse(item);
    const slotId =
      typeof item === "object" &&
      item !== null &&
      typeof (item as { slot?: unknown }).slot === "string"
        ? (item as { slot: string }).slot
        : `#${i + 1}`;
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      problems.push({
        slot: slotId,
        reason: `${issue?.path.join(".") || "question"}: ${issue?.message}`,
      });
      return;
    }
    const q = parsed.data;
    const slot = slots.get(q.slot);
    if (!slot) return problems.push({ slot: q.slot, reason: "no such slot" });
    if (ok.has(slot.id)) return problems.push({ slot: slot.id, reason: "slot answered twice" });
    if (!ctx.scope.has(q.topic))
      return problems.push({
        slot: slot.id,
        reason: `topic "${q.topic}" is outside the chosen topics`,
      });
    if (!SAME_KIND[slot.type].includes(q.type))
      return problems.push({
        slot: slot.id,
        reason: `must be a ${slot.type} question, not ${q.type}`,
      });
    let type = q.type;
    if (type !== slot.type) {
      type = slot.type;
      fixed++;
    }
    if (q.marks !== slot.marks) fixed++;

    if (type === "mcq") {
      const options = q.options ?? [];
      if (options.length !== 4 || new Set(options).size !== 4)
        return problems.push({ slot: slot.id, reason: "needs exactly 4 different options" });
      if (!options.includes(q.answer))
        return problems.push({
          slot: slot.id,
          reason: "the answer must be copied exactly from the options",
        });
    } else if (q.scheme.length === 0) {
      return problems.push({ slot: slot.id, reason: "needs a marking scheme" });
    }
    if (type === "numerical") {
      if (!q.check)
        return problems.push({ slot: slot.id, reason: "a numerical needs a check calculation" });
      try {
        const value = ctx.evaluate(q.check.expression);
        const close =
          Math.abs(value - q.check.answer) <= Math.max(1e-9, Math.abs(q.check.answer) * 0.01);
        if (!close)
          return problems.push({
            slot: slot.id,
            reason: `the calculation gives ${value}, not ${q.check.answer}`,
          });
        if (q.check.unit && !statesUnit(q.answer, q.check.unit))
          return problems.push({
            slot: slot.id,
            reason: `the answer must state the unit ${q.check.unit}`,
          });
      } catch {
        return problems.push({ slot: slot.id, reason: "the check calculation could not be run" });
      }
    }
    const closest = Math.max(0, ...ctx.pyqs.map((p) => similarity(p, q.question)));
    let source = q.source;
    if (source === "pyq-repeat") {
      if (closest < REPEAT_SIMILARITY || repeatMarks + slot.marks > ctx.pyqRepeatMarks) {
        // Not a real past question (or over the share): it must be a new question.
        if (closest >= COPY_SIMILARITY)
          return problems.push({
            slot: slot.id,
            reason: "too close to a past question; write a new one",
          });
        source = "pyq-style";
        fixed++;
      } else repeatMarks += slot.marks;
    } else if (closest >= COPY_SIMILARITY) {
      return problems.push({ slot: slot.id, reason: "copies a past question; write a new one" });
    }
    const scheme = type === "mcq" ? [] : fitScheme(q.scheme, slot.marks);
    ok.set(slot.id, {
      id: slot.id,
      type,
      topic: q.topic,
      marks: slot.marks,
      question: q.question,
      ...(type === "mcq" ? { options: q.options } : {}),
      answer: q.answer,
      scheme,
      source,
      ...(type === "numerical" && q.check ? { check: q.check } : {}),
    });
  });
  for (const s of planned.slots)
    if (!ok.has(s.id) && !problems.some((p) => p.slot === s.id))
      problems.push({ slot: s.id, reason: "missing" });
  return { ok, problems, fixed };
}

/** Marks a written section of the paper is worth (choice counted). */
export function paperSectionMarks(s: Pick<PaperSection, "attempt" | "questions">): number {
  return sectionMarks({ attempt: s.attempt, questions: s.questions });
}

export function paperMarks(paper: Pick<Paper, "sections">): number {
  return paper.sections.reduce((sum, s) => sum + paperSectionMarks(s), 0);
}

/**
 * The last check before a paper is shown: every question inside the chosen topics, choice
 * sections with equal marks, and the marks adding up exactly to the total picked.
 */
export function paperProblems(paper: Paper, scope: ReadonlySet<string>, total: number): string[] {
  const problems: string[] = [];
  for (const s of paper.sections) {
    for (const q of s.questions)
      if (!scope.has(q.topic)) problems.push(`${s.name} ${q.id}: topic "${q.topic}" not chosen`);
    if (s.attempt) {
      if (s.attempt >= s.questions.length)
        problems.push(`${s.name}: choice of ${s.attempt} from ${s.questions.length}`);
      if (new Set(s.questions.map((q) => q.marks)).size > 1)
        problems.push(`${s.name}: choice questions must carry equal marks`);
    }
  }
  const got = paperMarks(paper);
  if (got !== total) problems.push(`marks add up to ${got}, not ${total}`);
  return problems;
}

/** The marks a section of slots may give to "PYQ repeat" questions (a small share). */
export const PYQ_REPEAT_SHARE = 0.2;

export function sectionPrompt(input: {
  subjectName: string;
  section: PlannedSection;
  topics: readonly { id: string; name: string; unit: string }[];
  facts: Readonly<Record<string, readonly string[]>>;
  material: readonly string[];
  reference: readonly string[];
  pyqs: readonly string[];
  pyqRepeat: boolean;
  difficulty: "easy" | "mixed" | "hard";
  styleNote: string;
  avoid: readonly string[];
  problems?: readonly SlotProblem[];
}): { system: string; prompt: string } {
  const diff = {
    easy: "Easy: direct recall and single-step problems.",
    mixed:
      "Mixed, like a real paper: some recall, mostly application, one or two harder questions.",
    hard: "Hard: multi-step problems, applications and reasoning; no pure recall.",
  }[input.difficulty];
  const system = `You are a university examiner writing part of an engineering mock exam.
Rules:
- Write exactly one question for each SLOT below, with the slot's id, type and marks, testing the slot's topic (use its topic id). Never test anything outside the listed topics.
- Ground every question in the SOURCE material below (the student's notes, lesson facts, reference text). Don't ask about things the sources don't support.
- "mcq": exactly 4 different options, one correct; "answer" is the correct option copied exactly; "scheme": [].
- Other types: "answer" is a model answer sized to the marks; "scheme" lists 2-6 points an examiner gives marks for, each with its "marks" (adding up to the question's marks).
- "numerical": include "check": {"expression": a plain calculation with numbers only (mathjs, e.g. "8.99e9*2e-6/0.05^2"), "answer": the number it gives, "unit": its SI unit (omit for pure numbers)}. The model answer must state that number with that unit.
- "derivation": ask to derive a result; the scheme lists the steps. "diagram": ask for a labelled diagram and its explanation; the scheme names the labels expected.
- "source": "material" (from the student's notes), "lesson" (from the lesson facts or reference text), "pyq-style" (styled on a past question but new).${input.pyqRepeat ? `\n- You MAY reuse up to ${Math.round(PYQ_REPEAT_SHARE * 100)}% of the marks as real past questions from the PAST QUESTIONS list, copied as printed, with "source": "pyq-repeat". Every other question must be new: never copy a past question.` : "\n- Never copy a past question; write new ones in the same style."}
- Difficulty: ${diff}
- ${input.styleNote}
- Markdown and KaTeX ($...$) allowed; no HTML.
Reply with JSON only: {"questions":[{"slot":"s1q1","type":"mcq","topic":"<topic id>","marks":1,"question":"...","options":["...","...","...","..."],"answer":"...","scheme":[],"source":"lesson"}]}`;
  const slotLines = input.section.slots.map(
    (s) => `- ${s.id}: ${s.type}, ${s.marks} ${s.marks === 1 ? "mark" : "marks"}, topic ${s.topic}`,
  );
  const topicLines = input.topics.map((t) => `- ${t.id}: ${t.name} (${t.unit})`);
  const factLines = Object.entries(input.facts).flatMap(([topic, list]) =>
    list.map((f) => `- [${topic}] ${f}`),
  );
  const prompt = `Subject: ${input.subjectName}
Section: ${input.section.name}${input.section.attempt ? ` (students answer any ${input.section.attempt} of ${input.section.slots.length})` : ""}

SLOTS:
${slotLines.join("\n")}

TOPICS (the only ones allowed):
${topicLines.join("\n")}
${factLines.length ? `\nLESSON FACTS:\n${factLines.join("\n")}` : ""}${input.material.length ? `\n\nSTUDENT'S NOTES:\n${input.material.map((m) => `- ${m}`).join("\n")}` : ""}${input.reference.length ? `\n\nREFERENCE TEXT:\n${input.reference.join("\n\n")}` : ""}${input.pyqs.length ? `\n\nPAST QUESTIONS (style and difficulty):\n${input.pyqs.map((q) => `- ${q}`).join("\n")}` : ""}${input.avoid.length ? `\n\nALREADY IN THE PAPER (don't repeat):\n${input.avoid.map((q) => `- ${q}`).join("\n")}` : ""}${input.problems?.length ? `\n\nYOUR LAST ANSWER FAILED THESE CHECKS. Rewrite only these slots:\n${input.problems.map((p) => `- ${p.slot}: ${p.reason}`).join("\n")}` : ""}`;
  return { system, prompt };
}

/** A predictable section from the test AI: every slot filled correctly. */
export function fakeSection(section: PlannedSection): unknown[] {
  return section.slots.map((s, i) => {
    const base = { slot: s.id, topic: s.topic, marks: s.marks, source: "lesson" as const };
    if (s.type === "mcq")
      return {
        ...base,
        type: "mcq",
        question: `Which statement about ${s.topic} is true? (test question ${i + 1})`,
        options: ["Statement A", "Statement B", "Statement C", "Statement D"],
        answer: "Statement A",
        scheme: [],
      };
    if (s.type === "numerical")
      return {
        ...base,
        type: "numerical",
        question: `Compute $2 \\times ${s.marks}$. (test question ${i + 1})`,
        answer: `${2 * s.marks}`,
        scheme: [
          { point: "Correct method", marks: 1 },
          { point: "Correct answer", marks: 1 },
        ],
        check: { expression: `2*${s.marks}`, answer: 2 * s.marks },
      };
    return {
      ...base,
      type: s.type,
      question: `Explain the main idea of ${s.topic}. (test question ${i + 1})`,
      answer: "The main idea, explained with one example.",
      scheme: [
        { point: "States the main idea", marks: 1 },
        { point: "Gives one example", marks: 1 },
      ],
    };
  });
}
