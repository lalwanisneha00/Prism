import { z } from "zod";

/*
 * The shape of a university paper (mock test overhaul): its sections, how many questions each
 * has, the marks and type of each question, and any internal choice ("attempt any 4 of 6").
 * Read once from an uploaded paper and kept with the upload, then scaled to the total the
 * student picks, like resizing a recipe: a 100-mark end-sem turned into a 30-mark mock keeps the
 * same mix of short answers, long answers and numericals. Pure: no AI and no storage here.
 */

export const QUESTION_TYPES = [
  "mcq",
  "short",
  "long",
  "numerical",
  "derivation",
  "diagram",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const questionTypeLabel: Record<QuestionType, string> = {
  mcq: "Multiple choice",
  short: "Short answer",
  long: "Long answer",
  numerical: "Numerical",
  derivation: "Derivation",
  diagram: "Diagram",
};

/** What a student says an uploaded paper is. */
export const PAPER_KINDS = ["end-sem", "mid-sem", "internal", "other"] as const;
export type PaperKind = (typeof PAPER_KINDS)[number];
export const paperKindLabel: Record<PaperKind, string> = {
  "end-sem": "End-sem PYQ",
  "mid-sem": "Mid-sem",
  internal: "Internal assessment",
  other: "Other",
};

/** The exam styles a mock can copy ("Like my end-sem"). */
export const EXAM_STYLES = ["end-sem", "mid-sem", "internal"] as const;
export type ExamStyle = (typeof EXAM_STYLES)[number];
export const examStyleLabel: Record<ExamStyle, string> = {
  "end-sem": "Like my end-sem",
  "mid-sem": "Like my mid-sem",
  internal: "Like my internal",
};

export function isExamStyle(value: unknown): value is ExamStyle {
  return typeof value === "string" && (EXAM_STYLES as readonly string[]).includes(value);
}

const PatternQuestionSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  marks: z.number().positive().max(100),
});

export const PatternSectionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  instructions: z.string().trim().max(200).optional(),
  /** Internal choice: how many of the questions the student answers. Missing = all. */
  attempt: z.int().positive().max(40).optional(),
  questions: z.array(PatternQuestionSchema).min(1).max(40),
});

export const PaperPatternSchema = z.object({
  version: z.literal(1),
  /** The marks a student can score (choice taken into account). */
  totalMarks: z.number().positive().max(300),
  minutes: z.int().positive().max(360).optional(),
  sections: z.array(PatternSectionSchema).min(1).max(10),
  /** Short pieces of the paper's questions: style examples and how often topics come up. */
  samples: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  /** "ai" when the AI read the paper, "rules" when the free rule-based reader did. */
  source: z.enum(["ai", "rules", "default"]),
  analysedAt: z.number(),
});

export type PatternSection = z.infer<typeof PatternSectionSchema>;
export type PaperPattern = z.infer<typeof PaperPatternSchema>;

/** Marks a section is worth: with a choice, the best `attempt` questions count. */
export function sectionMarks(s: Pick<PatternSection, "attempt" | "questions">): number {
  const marks = s.questions.map((q) => q.marks).sort((a, b) => b - a);
  const counted = s.attempt && s.attempt < marks.length ? marks.slice(0, s.attempt) : marks;
  return counted.reduce((a, b) => a + b, 0);
}

export function patternMarks(p: Pick<PaperPattern, "sections">): number {
  return p.sections.reduce((sum, s) => sum + sectionMarks(s), 0);
}

const repeat = (type: QuestionType, marks: number, n: number) =>
  Array.from({ length: n }, () => ({ type, marks }));

/**
 * The usual Indian university pattern for each exam, used when the student has no papers of
 * that kind: a part of one-mark objective questions, short answers with a choice, and long
 * answers (including numericals and derivations) with a choice.
 */
export function defaultPattern(style: ExamStyle): PaperPattern {
  const base = { version: 1 as const, samples: [], source: "default" as const, analysedAt: 0 };
  if (style === "internal")
    return {
      ...base,
      totalMarks: 20,
      minutes: 45,
      sections: [
        { name: "Section A", instructions: "Answer all.", questions: repeat("mcq", 1, 5) },
        {
          name: "Section B",
          instructions: "Answer any 3.",
          attempt: 3,
          questions: [...repeat("short", 3, 3), { type: "numerical", marks: 3 }],
        },
        { name: "Section C", questions: [{ type: "long", marks: 6 }] },
      ],
    };
  if (style === "mid-sem")
    return {
      ...base,
      totalMarks: 50,
      minutes: 90,
      sections: [
        { name: "Section A", instructions: "Answer all.", questions: repeat("mcq", 1, 10) },
        {
          name: "Section B",
          instructions: "Answer any 4.",
          attempt: 4,
          questions: [...repeat("short", 5, 3), ...repeat("numerical", 5, 2)],
        },
        {
          name: "Section C",
          instructions: "Answer any 2.",
          attempt: 2,
          questions: [
            { type: "long", marks: 10 },
            { type: "numerical", marks: 10 },
            { type: "derivation", marks: 10 },
          ],
        },
      ],
    };
  return {
    ...base,
    totalMarks: 100,
    minutes: 180,
    sections: [
      { name: "Section A", instructions: "Answer all.", questions: repeat("mcq", 1, 10) },
      {
        name: "Section B",
        instructions: "Answer any 6.",
        attempt: 6,
        questions: [...repeat("short", 5, 6), ...repeat("numerical", 5, 2)],
      },
      {
        name: "Section C",
        instructions: "Answer any 4.",
        attempt: 4,
        questions: [
          { type: "long", marks: 15 },
          { type: "numerical", marks: 15 },
          { type: "long", marks: 15 },
          { type: "derivation", marks: 15 },
          { type: "diagram", marks: 15 },
          { type: "numerical", marks: 15 },
        ],
      },
    ],
  };
}

/**
 * Several papers of one kind for one subject: the newest gives the structure (patterns change
 * over the years), every paper adds its samples. Undefined when there are none.
 */
export function mergePatterns(patterns: readonly PaperPattern[]): PaperPattern | undefined {
  if (patterns.length === 0) return undefined;
  const newest = [...patterns].sort((a, b) => b.analysedAt - a.analysedAt)[0];
  const samples = [...new Set(patterns.flatMap((p) => p.samples))].slice(0, 30);
  return { ...newest, samples };
}

/** One question to write: its place, type and marks (and later the topic it tests). */
export type Slot = { id: string; type: QuestionType; marks: number };
export type BlueprintSection = {
  id: string;
  name: string;
  instructions?: string;
  attempt?: number;
  slots: Slot[];
};

/** Most questions a mock may have, so a paper stays quick to write and to take. */
export const MAX_QUESTIONS = 40;

/** Splits `total` into whole numbers in proportion to `weights` (largest remainder). */
export function apportion(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, rest: r - Math.floor(r) }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i]++;
    left--;
  }
  return out;
}

/** The most common marks in a list (ties → the larger). */
function typicalMarks(marks: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const m of marks) counts.set(m, (counts.get(m) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
}

/** Picks `n` items spread evenly over a list, keeping their order (the type mix survives). */
function spread<T>(list: readonly T[], n: number): T[] {
  return Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]);
}

/**
 * The pattern resized to exactly `total` marks. Each section keeps its share of the marks and
 * its mix of question types; questions get fewer marks (gently) and there are fewer of them;
 * a section with a choice keeps its choice ratio and equal marks per question, so any choice
 * the student makes is worth the same.
 */
export function scalePattern(
  pattern: Pick<PaperPattern, "sections">,
  total: number,
): BlueprintSection[] {
  const target = Math.max(1, Math.round(total));
  const sections = pattern.sections.filter((s) => sectionMarks(s) > 0);
  const original = sections.reduce((sum, s) => sum + sectionMarks(s), 0);
  const factor = target / original;
  const budgets = apportion(
    target,
    sections.map((s) => sectionMarks(s)),
  );
  const out: BlueprintSection[] = [];
  let questionsLeft = MAX_QUESTIONS;
  // Marks of a section that found no room (very long papers): added to the last question.
  let carry = 0;

  sections.forEach((s, si) => {
    const budget = budgets[si];
    if (budget <= 0) return;
    if (questionsLeft <= 0) {
      carry += budget;
      return;
    }
    const types = s.questions.map((q) => q.type);
    const offeredOriginal = s.questions.length;
    const attemptOriginal = s.attempt && s.attempt < offeredOriginal ? s.attempt : offeredOriginal;
    const objective = types.every((t) => t === "mcq");
    const m = typicalMarks(s.questions.map((q) => q.marks));
    // Objective questions keep their marks; written ones shrink (or grow) gently.
    const ideal = objective ? m : Math.max(1, m * Math.sqrt(factor));
    const maxCount = Math.max(
      1,
      Math.min(budget, questionsLeft, objective ? budget : attemptOriginal * 2),
    );
    let choice = attemptOriginal < offeredOriginal;

    let count = 1;
    if (choice) {
      // Equal marks for every question in a choice section: the count must divide the budget.
      for (let n = 1; n <= Math.min(maxCount, attemptOriginal); n++) {
        if (budget % n !== 0) continue;
        if (Math.abs(budget / n - ideal) < Math.abs(budget / count - ideal)) count = n;
      }
    } else {
      count = Math.min(maxCount, Math.max(1, Math.round(budget / ideal)));
    }
    let offered = choice
      ? Math.max(count + 1, Math.round((count * offeredOriginal) / attemptOriginal))
      : count;
    if (offered > questionsLeft) {
      // No room for the extra choices: everyone answers every question.
      choice = false;
      count = Math.min(count, questionsLeft);
      offered = count;
    }
    const marks = choice
      ? Array.from({ length: offered }, () => budget / count)
      : apportion(
          budget,
          Array.from({ length: count }, () => 1),
        );
    questionsLeft -= offered;
    const sectionId = `s${si + 1}`;
    out.push({
      id: sectionId,
      name: s.name,
      ...(s.instructions && !(attemptOriginal < offeredOriginal && !choice)
        ? { instructions: s.instructions }
        : {}),
      ...(choice ? { attempt: count } : {}),
      slots: spread(types, offered).map((type, i) => ({
        id: `${sectionId}q${i + 1}`,
        // A one-mark slot can't hold a long answer: it becomes a short answer.
        type: marks[i] < 2 && type !== "mcq" ? "short" : type,
        marks: marks[i],
      })),
    });
  });
  if (carry > 0 && out.length > 0) {
    const plain = [...out].reverse().find((s) => !s.attempt) ?? out[out.length - 1];
    if (plain.attempt) {
      // Every question of a choice section gets the same extra marks only if it divides.
      const each = carry / plain.attempt;
      if (Number.isInteger(each)) for (const q of plain.slots) q.marks += each;
      else {
        // Otherwise the choice goes: every question is answered, the last one gets the rest.
        plain.slots = plain.slots.slice(0, plain.attempt);
        delete plain.attempt;
        plain.slots[plain.slots.length - 1].marks += carry;
      }
    } else plain.slots[plain.slots.length - 1].marks += carry;
  }
  return out;
}

/** Marks a blueprint is worth (choice taken into account). */
export function blueprintMarks(sections: readonly BlueprintSection[]): number {
  return sections.reduce(
    (sum, s) => sum + sectionMarks({ attempt: s.attempt, questions: s.slots }),
    0,
  );
}

/** Rounds to the nearest 5 minutes, at least 10. */
const round5 = (m: number) => Math.max(10, Math.round(m / 5) * 5);

/** A time limit for a mock: the paper's own pace when known, otherwise the usual pace. */
export function suggestMinutes(
  total: number,
  pattern?: Pick<PaperPattern, "minutes" | "totalMarks">,
  style: ExamStyle = "end-sem",
): number {
  const pace =
    pattern?.minutes && pattern.totalMarks
      ? pattern.minutes / pattern.totalMarks
      : (defaultPattern(style).minutes ?? 180) / defaultPattern(style).totalMarks;
  return Math.min(240, round5(total * pace));
}

/** "10 MCQs × 1, any 6 of 8 short × 5 …": a pattern in one line. */
export function describePattern(sections: readonly BlueprintSection[]): string {
  return sections
    .map((s) => {
      const marks = s.slots[0]?.marks ?? 0;
      const kinds = [...new Set(s.slots.map((q) => q.type))].map((t) =>
        questionTypeLabel[t].toLowerCase(),
      );
      const count = s.attempt ? `any ${s.attempt} of ${s.slots.length}` : `${s.slots.length}`;
      const each = s.slots.every((q) => q.marks === marks) ? ` × ${marks}` : "";
      return `${s.name}: ${count} ${kinds.join("/")}${each}`;
    })
    .join(" · ");
}
