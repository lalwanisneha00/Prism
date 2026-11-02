import { z } from "zod";
import { statesUnit } from "@/lib/units";
import { cleanAiText, displayProblems } from "@/lib/mock/mathClean";
import { commandProblem, isRecall, mcqProblem, outputProblem } from "@/lib/mock/verify";
import { ANSWER_SIZE, CORRECTNESS_RULES } from "@/lib/mock/rules";
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

/**
 * How a question sits in the syllabus: A = inside the chosen units (most of the paper), B = a
 * prerequisite the units rely on (some), C = beyond the units, D = another unit or subject.
 * C and D are refused; B is capped (PREREQ_SHARE).
 */
export const RELEVANCE = ["A", "B", "C", "D"] as const;
export type Relevance = (typeof RELEVANCE)[number];
/** Difficulty by the thinking a question needs, not by how long its wording is. */
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

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
  /** MCQs: one line on why the answer is right (older papers have none). */
  reason: z.string().trim().max(400).optional(),
  /** The marking scheme: what an examiner gives marks for. Empty for MCQs. */
  scheme: z.array(SchemePointSchema).max(10).default([]),
  source: z.enum(QUESTION_SOURCES),
  check: z
    .object({
      expression: z.string().trim().min(1).max(300),
      answer: z.number(),
      // The AI often sends "" for a pure number: that means no unit, not a broken question.
      unit: z
        .string()
        .trim()
        .max(40)
        .optional()
        .transform((u) => u || undefined),
    })
    .optional(),
  // Internal metadata (not shown to the student; older papers have none).
  /** What the question tests, in one line ("Tell declaration from initialization of a variable"). */
  learningOutcome: z.string().trim().max(200).optional(),
  relevance: z.enum(RELEVANCE).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  /** The points a full answer must make (the answer sheet's backbone). */
  answerPoints: z.array(z.string().trim().min(1).max(300)).max(8).optional(),
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
  // The writer must say what each question tests and where it sits in the syllabus.
  learningOutcome: text.max(200),
  relevance: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
    z.enum(RELEVANCE),
  ),
  difficulty: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toLowerCase() : v),
    z.enum(DIFFICULTIES),
  ),
  answerPoints: z.array(text.max(300)).max(8).default([]),
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
  /** Marks plain recall questions may still take (the warm-up share). Missing = no limit. */
  recallMarks?: number;
  /** Marks prerequisite (relevance B) questions may still take. Missing = no limit. */
  prereqMarks?: number;
  evaluate: (expression: string) => number;
};

type SlotAnswer = z.infer<typeof SlotAnswerSchema>;

/** Every text of a question with its maths tidied (see mathClean.ts). */
function cleanQuestion(q: SlotAnswer): SlotAnswer {
  return {
    ...q,
    question: cleanAiText(q.question),
    answer: cleanAiText(q.answer),
    ...(q.options ? { options: q.options.map(cleanAiText) } : {}),
    ...(q.reason ? { reason: cleanAiText(q.reason) } : {}),
    scheme: q.scheme.map((p) => ({ ...p, point: cleanAiText(p.point) })),
    answerPoints: q.answerPoints.map(cleanAiText),
  };
}

/** Every text shown for a question (the paper and the answer sheet). */
export function shownTexts(
  q: Pick<PaperQuestion, "question" | "answer" | "options" | "reason" | "scheme">,
): string[] {
  return [
    q.question,
    q.answer,
    ...(q.options ?? []),
    ...(q.reason ? [q.reason] : []),
    ...q.scheme.map((p) => p.point),
  ];
}

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
  let recallMarks = 0;
  let prereqMarks = 0;
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
    const q = cleanQuestion(parsed.data);
    const slot = slots.get(q.slot);
    if (!slot) return problems.push({ slot: q.slot, reason: "no such slot" });
    if (ok.has(slot.id)) return problems.push({ slot: slot.id, reason: "slot answered twice" });
    if (!ctx.scope.has(q.topic))
      return problems.push({
        slot: slot.id,
        reason: `topic "${q.topic}" is outside the chosen topics`,
      });
    if (q.relevance === "D")
      return problems.push({
        slot: slot.id,
        reason:
          "off-syllabus (relevance D): it belongs to another unit, course or language; test the slot's topic as this course teaches it",
      });
    if (q.relevance === "C")
      return problems.push({
        slot: slot.id,
        reason:
          "beyond the chosen units (relevance C): ask about what the syllabus topic itself covers",
      });
    if (q.relevance === "B") {
      if (prereqMarks + slot.marks > (ctx.prereqMarks ?? Infinity))
        return problems.push({
          slot: slot.id,
          reason: "too many prerequisite questions: test the chosen units themselves (relevance A)",
        });
      prereqMarks += slot.marks;
    }
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

    const shown = shownTexts(q).flatMap(displayProblems);
    if (shown.length) return problems.push({ slot: slot.id, reason: shown[0] });
    const key = { ...q, type };
    const keyProblem =
      type === "mcq" ? (mcqProblem(key) ?? outputProblem(key.question)) : commandProblem(key);
    if (keyProblem) return problems.push({ slot: slot.id, reason: keyProblem });
    if (type !== "mcq" && q.scheme.length === 0)
      return problems.push({ slot: slot.id, reason: "needs a marking scheme" });
    if (isRecall(q.question)) {
      if (recallMarks + slot.marks > (ctx.recallMarks ?? Infinity))
        return problems.push({
          slot: slot.id,
          reason:
            "too much plain recall in this paper: ask to explain, apply, derive, solve or compare instead",
        });
      recallMarks += slot.marks;
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
      ...(type === "mcq" && q.reason ? { reason: q.reason } : {}),
      scheme,
      source,
      ...(type === "numerical" && q.check ? { check: q.check } : {}),
      learningOutcome: q.learningOutcome,
      relevance: q.relevance,
      difficulty: q.difficulty,
      ...(q.answerPoints.length ? { answerPoints: q.answerPoints } : {}),
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
 * How alike two questions are, by word stems (the first 6 letters), so "differentiate" and
 * "difference", "variable" and "variables" count as the same word.
 */
export function stemSimilarity(a: string, b: string): number {
  const stems = (s: string) => new Set(words(s).map((w) => w.slice(0, 6)));
  const x = stems(a);
  const y = stems(b);
  if (x.size === 0 || y.size === 0) return 0;
  let shared = 0;
  for (const w of x) if (y.has(w)) shared++;
  return shared / (x.size + y.size - shared);
}

/** Two questions this alike (word stems) are the same question reworded. */
export const DUPLICATE_SIMILARITY = 0.75;
/** Two learning outcomes this alike, on the same topic, test the same thing twice. */
const SAME_OUTCOME_SIMILARITY = 0.8;

/**
 * Questions that repeat an earlier one in the paper (same wording, or the same learning outcome on
 * the same topic). Each repeat is reported once, against the first question it repeats.
 */
export function duplicateIssues(
  questions: readonly Pick<PaperQuestion, "id" | "topic" | "question" | "learningOutcome">[],
): { id: string; of: string; reason: string }[] {
  const out: { id: string; of: string; reason: string }[] = [];
  questions.forEach((q, i) => {
    for (const earlier of questions.slice(0, i)) {
      if (stemSimilarity(q.question, earlier.question) >= DUPLICATE_SIMILARITY) {
        out.push({ id: q.id, of: earlier.id, reason: `repeats question ${earlier.id}` });
        return;
      }
      if (
        q.learningOutcome &&
        earlier.learningOutcome &&
        q.topic === earlier.topic &&
        stemSimilarity(q.learningOutcome, earlier.learningOutcome) >= SAME_OUTCOME_SIMILARITY
      ) {
        out.push({
          id: q.id,
          of: earlier.id,
          reason: `tests the same learning outcome as question ${earlier.id}; test a different idea`,
        });
        return;
      }
    }
  });
  return out;
}

/**
 * The last check before a paper is shown (plain code, no AI): every question inside the chosen
 * topics, the planned number of questions in each section, choice sections with equal marks, no
 * repeated question, and the marks adding up exactly to the total picked.
 */
export function paperProblems(
  paper: Paper,
  scope: ReadonlySet<string>,
  total: number,
  plan?: readonly Pick<PlannedSection, "id" | "slots">[],
): string[] {
  const problems: string[] = [];
  for (const planned of plan ?? []) {
    const got = paper.sections.find((s) => s.id === planned.id)?.questions.length ?? 0;
    if (got !== planned.slots.length)
      problems.push(`section ${planned.id}: ${got} questions, planned ${planned.slots.length}`);
  }
  for (const d of duplicateIssues(paper.sections.flatMap((s) => s.questions)))
    problems.push(`${d.id}: ${d.reason}`);
  for (const s of paper.sections) {
    for (const q of s.questions) {
      if (!scope.has(q.topic)) problems.push(`${s.name} ${q.id}: topic "${q.topic}" not chosen`);
      const schemeMarks = q.scheme.reduce((n, p) => n + p.marks, 0);
      if (q.type !== "mcq" && Math.abs(schemeMarks - q.marks) > 1e-9)
        problems.push(`${s.name} ${q.id}: scheme gives ${schemeMarks} of ${q.marks} marks`);
      const shown = shownTexts(q).flatMap(displayProblems);
      if (shown.length) problems.push(`${s.name} ${q.id}: ${shown[0]}`);
    }
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
/** Most of the paper's marks plain recall (define, state, list, the value of…) may take. */
export const RECALL_SHARE = 0.15;
/** Most of the paper's marks prerequisite (relevance B) questions may take; the rest is A. */
export const PREREQ_SHARE = 0.25;

/** What the examiner (or a code check) found wrong with a question, sent back to the writer. */
export type Feedback = {
  slot: string;
  issues: readonly string[];
  fix?: string;
  /** The failed question and answer, to correct (absent = write a completely new question). */
  previous?: string;
};

export function sectionPrompt(input: {
  subjectName: string;
  /** "Computer Programming - I, PDEU, semester 1" */
  course: string;
  section: PlannedSection;
  topics: readonly { id: string; name: string; unit: string }[];
  /** Topics of the same subject that are NOT in this paper (the other side of the boundary). */
  outside: readonly string[];
  /** The student's uploaded syllabus text for this subject, if any. */
  syllabus?: string;
  facts: Readonly<Record<string, readonly string[]>>;
  material: readonly string[];
  reference: readonly string[];
  pyqs: readonly string[];
  pyqRepeat: boolean;
  difficulty: "easy" | "mixed" | "hard";
  styleNote: string;
  avoid: readonly string[];
  /** Marks plain recall questions may still take in this paper. */
  recallMarks?: number;
  /** Marks prerequisite (relevance B) questions may still take in this paper. */
  prereqMarks?: number;
  problems?: readonly SlotProblem[];
  /** The examiner's findings on earlier versions of these slots. */
  feedback?: readonly Feedback[];
}): { system: string; prompt: string } {
  const diff = {
    easy: "Easy: mostly easy and medium questions.",
    mixed:
      "Mixed, like a real paper: mostly medium (explain, apply, compare, solve, trace), a few easy, one or two hard.",
    hard: "Hard: mostly medium and hard (multi-step problems, applications, debugging, reasoning); no pure recall.",
  }[input.difficulty];
  const system = `You are a careful university examiner writing part of a mock exam for ${input.course}. Quality over quantity: every question must be inside the syllabus, technically correct, unambiguous and at exam level.
Rules:
- Write exactly one question for each SLOT below, with the slot's id, type and marks, testing the slot's topic (use its topic id) as THIS course teaches it.
- The SYLLABUS BOUNDARY is the list of TOPICS below. Topics listed under NOT IN THIS PAPER, other courses and other languages must not be asked.
- For each question give "relevance": "A" if it tests the slot's topic directly (most questions), "B" if it tests a prerequisite the topic relies on (only a few${input.prereqMarks !== undefined ? `: at most ${input.prereqMarks} more marks of them` : ""}), "C" if it goes beyond the chosen topics, "D" if it belongs to another unit, course or language. Only A and B questions are accepted: rewrite anything that would be C or D.
- "learningOutcome": one line on what the question tests (e.g. "Distinguish declaration from initialization of a variable"). Every question in the paper must test a different learning outcome.
- "difficulty": "easy", "medium" or "hard" by the thinking required.
- "answerPoints": the 1-6 points a full-marks answer must make.
${CORRECTNESS_RULES}
- Ground every question in the SOURCES (the syllabus, lesson facts, the student's notes, reference text). Don't ask about things they don't support.
- "mcq": exactly 4 different options, exactly one correct; "answer" is the correct option copied exactly; "reason": one line on why it is right; "scheme": [].
- Other types: "answer" is the model answer a top student would write, sized to the marks (${ANSWER_SIZE}) "scheme" lists 2-6 points showing where the marks go, each with its "marks", adding up to the question's marks.
- The answer and scheme give EXACTLY what the command word asks: "state the value" → the value; "define" → a definition; "derive" → the full derivation; "calculate" → working and the final answer with units; "compare"/"differentiate" → points of difference; "list N" → N items; "predict the output" → the exact output and why; "write a program" → a complete program that compiles.
- Plain recall (define, state, list, "the value of") is a small warm-up only${input.recallMarks !== undefined ? `: at most ${input.recallMarks} more marks of it in this part` : ""}.
- "numerical": include "check": {"expression": a plain calculation with numbers only (mathjs, e.g. "8.99e9*2e-6/0.05^2"), "answer": the number it gives, "unit": its SI unit (omit for pure numbers)}. The model answer must state that number with that unit.
- "derivation": ask to derive a result; the scheme lists the steps. "diagram": ask for a labelled diagram and its explanation; the scheme names the labels expected.
- Code: in fenced code blocks (three backticks and the language), complete and compilable unless the question is about finding the error.
- "source": "material" (from the student's notes), "lesson" (from the syllabus, lesson facts or reference text), "pyq-style" (styled on a past question but new).${input.pyqRepeat ? `\n- You MAY reuse up to ${Math.round(PYQ_REPEAT_SHARE * 100)}% of the marks as real past questions from the PAST QUESTIONS list, copied as printed, with "source": "pyq-repeat". Every other question must be new: never copy a past question.` : "\n- Never copy a past question; write new ones in the same style."}
- Difficulty mix: ${diff}
- ${input.styleNote}
- Maths: ALWAYS LaTeX inside $...$ (inline) or $$...$$ (on its own line), e.g. $\\sqrt{-1}$, $\\frac{a}{b}$, $\\pi$. Never write a LaTeX command outside dollar signs. In the JSON, write each backslash as \\\\ (e.g. "$\\\\frac{1}{2}$"). Markdown allowed; no HTML.
Reply with JSON only: {"questions":[{"slot":"s1q1","type":"mcq","topic":"<topic id>","marks":1,"learningOutcome":"...","relevance":"A","difficulty":"easy","question":"...","options":["...","...","...","..."],"answer":"...","reason":"...","answerPoints":["..."],"scheme":[],"source":"lesson"}]}`;
  const slotLines = input.section.slots.map(
    (s) => `- ${s.id}: ${s.type}, ${s.marks} ${s.marks === 1 ? "mark" : "marks"}, topic ${s.topic}`,
  );
  const topicLines = input.topics.map((t) => `- ${t.id}: ${t.name} (${t.unit})`);
  const factLines = Object.entries(input.facts).flatMap(([topic, list]) =>
    list.map((f) => `- [${topic}] ${f}`),
  );
  const feedbackLines = (input.feedback ?? []).map((f) =>
    f.previous
      ? `- ${f.slot}: CORRECT this version.\n  Previous: ${f.previous}\n  Examiner found: ${f.issues.join("; ")}${f.fix ? `\n  Fix: ${f.fix}` : ""}`
      : `- ${f.slot}: write a COMPLETELY NEW question on a different learning outcome (the earlier ones kept failing: ${f.issues.join("; ")}).`,
  );
  const prompt = `Course: ${input.course}
Section: ${input.section.name}${input.section.attempt ? ` (students answer any ${input.section.attempt} of ${input.section.slots.length})` : ""}

SLOTS:
${slotLines.join("\n")}

TOPICS (the syllabus boundary: the only ones allowed):
${topicLines.join("\n")}${input.outside.length ? `\n\nNOT IN THIS PAPER (other units of the course; don't ask these):\n${input.outside.map((t) => `- ${t}`).join("\n")}` : ""}${input.syllabus ? `\n\nSYLLABUS (uploaded by the student):\n${input.syllabus}` : ""}
${factLines.length ? `\nLESSON FACTS:\n${factLines.join("\n")}` : ""}${input.material.length ? `\n\nSTUDENT'S NOTES:\n${input.material.map((m) => `- ${m}`).join("\n")}` : ""}${input.reference.length ? `\n\nREFERENCE TEXT:\n${input.reference.join("\n\n")}` : ""}${input.pyqs.length ? `\n\nPAST QUESTIONS (style and difficulty):\n${input.pyqs.map((q) => `- ${q}`).join("\n")}` : ""}${input.avoid.length ? `\n\nALREADY IN THE PAPER (don't repeat these questions or their learning outcomes):\n${input.avoid.map((q) => `- ${q}`).join("\n")}` : ""}${feedbackLines.length ? `\n\nTHE EXAMINER REJECTED THESE SLOTS:\n${feedbackLines.join("\n")}` : ""}${input.problems?.length ? `\n\nYOUR LAST ANSWER FAILED THESE CHECKS. Rewrite only these slots:\n${input.problems.map((p) => `- ${p.slot}: ${p.reason}`).join("\n")}` : ""}`;
  return { system, prompt };
}

/**
 * Words only this slot's test question uses (so test questions never look like repeats). The
 * slot id comes first: the repeat check compares the first 6 letters of each word.
 */
const fakeTag = (slot: string) =>
  ["alpha", "bravo", "charlie", "delta"].map((w) => `${slot.replace(/\W/g, "")}${w}`).join(" ");

/** A predictable section from the test AI: every slot filled correctly. */
export function fakeSection(section: PlannedSection): unknown[] {
  return section.slots.map((s) => {
    const tag = fakeTag(s.id);
    const base = {
      slot: s.id,
      topic: s.topic,
      marks: s.marks,
      source: "lesson" as const,
      learningOutcome: `Test outcome ${tag}`,
      relevance: "A",
      difficulty: "medium",
    };
    if (s.type === "mcq")
      return {
        ...base,
        type: "mcq",
        question: `Which statement about ${s.topic} is true? (test question ${tag})`,
        options: ["Statement A", "Statement B", "Statement C", "Statement D"],
        answer: "Statement A",
        reason: "Statement A is the one the lesson states (test reason).",
        scheme: [],
      };
    if (s.type === "numerical")
      return {
        ...base,
        type: "numerical",
        question: `Compute $2 \\times ${s.marks}$. (test question ${tag})`,
        answer: `Multiply the two numbers.\n$2 \\times ${s.marks} = ${2 * s.marks}$`,
        scheme: [
          { point: "Correct method", marks: 1 },
          { point: "Correct answer", marks: 1 },
        ],
        check: { expression: `2*${s.marks}`, answer: 2 * s.marks },
      };
    return {
      ...base,
      type: s.type,
      question: `Explain the main idea of ${s.topic}. (test question ${tag})`,
      answer: "The main idea, explained with one example.",
      scheme: [
        { point: "States the main idea", marks: 1 },
        { point: "Gives one example", marks: 1 },
      ],
    };
  });
}
