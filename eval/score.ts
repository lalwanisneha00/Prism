import { z } from "zod";
import type { Lesson } from "@/lib/schema";
import { unsupportedSourcedNumbers } from "@/visuals/generic/sourcedNumbers";

/*
 * Scoring for the golden set (SPEC §6.5). A fact counts as "stated" when its pattern
 * appears in the lesson. It is a proxy for accuracy: it checks that the key facts are
 * present and written in their standard form, alongside the schema, maths and fact-check.
 */

/**
 * Where a key fact comes from (SPEC §12.3 rule 4): a trusted page and the exact words on it.
 * `npm run golden:check` fetches the page and confirms the quote is really there, so no fact
 * is written from a model's memory. Golden sets made before V3 have no quotes yet.
 */
export const FactSourceSchema = z.object({
  url: z.url(),
  quote: z.string().trim().min(12).max(600),
});

export const GoldenFactSchema = z.object({
  id: z.string(),
  claim: z.string(),
  pattern: z.string(),
  source: FactSourceSchema.optional(),
});

export const GoldenSchema = z.object({
  description: z.string(),
  subject: z.string(),
  topics: z
    .array(
      z.object({
        topic: z.string(),
        chapter: z.string(),
        facts: z.array(GoldenFactSchema).min(1),
      }),
    )
    .min(1),
});
export type Golden = z.infer<typeof GoldenSchema>;
export type GoldenTopic = Golden["topics"][number];

/** All the teaching text of a lesson, flattened. */
export function lessonText(lesson: Lesson): string {
  return [
    lesson.hook,
    ...lesson.prerequisites.flatMap((p) => [p.concept, p.oneLiner]),
    ...lesson.sections.flatMap((s) => [s.title, s.body, s.visual?.caption ?? ""]),
    ...lesson.analogies.flatMap((a) => [a.analogy, a.whereItBreaks]),
    ...lesson.workedExamples.flatMap((w) => [w.problem, ...w.steps, w.answer]),
    ...lesson.misconceptions.flatMap((m) => [m.wrong, m.right, m.why]),
    ...lesson.quiz.flatMap((q) => [q.question, ...(q.options ?? []), q.answer, q.explanation]),
    ...lesson.revisionSheet.formulas,
    ...lesson.revisionSheet.keyPoints,
    ...(lesson.revisionSheet.mnemonics ?? []),
    ...lesson.audioScript.map((a) => a.text),
  ].join("\n");
}

/** Unicode maths written in plain text, spelled the way LaTeX would (ε₀ → epsilon_0). */
const UNICODE_MATH: [RegExp, string][] = [
  [/[εϵ]/g, "epsilon"],
  [/π/g, "pi"],
  [/λ/g, "lambda"],
  [/σ/g, "sigma"],
  [/μ/g, "mu"],
  [/[Φφϕ]/g, "phi"],
  [/θ/g, "theta"],
  [/[ωΩ]/g, "omega"],
  [/κ/g, "kappa"],
  [/τ/g, "tau"],
  [/Δ/g, "delta"],
  [/∂/g, "partial"],
  [/∇/g, "nabla"],
  [/∮|∫/g, "int"],
  [/∞/g, "infty"],
  [/√/g, "sqrt"],
  [/−/g, "-"],
  [/⋅/g, "·"],
];
const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";
const SUPERSCRIPTS: Record<string, string> = { "²": "^2", "³": "^3", ⁿ: "^n", "⁻": "^-" };

/**
 * Lower-case, LaTeX backslashes and braces removed, spaces collapsed, and Unicode maths
 * (ε₀, π, x²) spelled like LaTeX, so a fact counts however the lesson typed it.
 */
export function normalizeForMatch(text: string): string {
  // Formatting commands change how a symbol looks, not what it says: \mathbf{p} is just p.
  let t = text.replace(
    /\\(mathbf|boldsymbol|bm|vec|hat|mathrm|text|textbf|textit|operatorname|mathit|displaystyle|left|right|big|Big)\b/g,
    "",
  );
  for (const [re, name] of UNICODE_MATH) t = t.replace(re, name);
  t = t
    .replace(/[₀-₉]/g, (c) => `_${SUBSCRIPTS.indexOf(c)}`)
    .replace(/[²³ⁿ⁻]/g, (c) => SUPERSCRIPTS[c]);
  return t
    .toLowerCase()
    .replace(/\\/g, "")
    .replace(/[{}]/g, "")
    .replace(/[ \t]+/g, " ");
}

export type TopicScore = { topic: string; found: string[]; missing: string[] };

export function scoreLesson(lesson: Lesson, entry: GoldenTopic): TopicScore {
  return scoreText(lessonText(lesson), entry);
}

/** Scores a lesson's plain text (as saved in eval/results/lessons) against one golden topic. */
export function scoreText(lessonPlainText: string, entry: GoldenTopic): TopicScore {
  const text = normalizeForMatch(lessonPlainText);
  const found: string[] = [];
  const missing: string[] = [];
  for (const fact of entry.facts) {
    (new RegExp(fact.pattern, "i").test(text) ? found : missing).push(fact.id);
  }
  return { topic: entry.topic, found, missing };
}

export type VisualReport = {
  /** Sections with a visual. */
  visuals: number;
  /** Visuals that fail the registry/sanity checks (should be 0: the pipeline drops them). */
  invalid: string[];
  /** Numbers on "sourced" charts that appear neither in the lesson nor in the cited source. */
  unsupportedNumbers: string[];
};

/**
 * Visual checks for the eval (SPEC §4.1): every visual is valid for its topic, and numbers on
 * charts that claim to be sourced really appear in the lesson text or the cited excerpt.
 */
export function visualReport(
  lesson: Lesson,
  problems: string[],
  excerpts: Record<string, string>,
): VisualReport {
  const unsupported = unsupportedSourcedNumbers(lesson, excerpts).flatMap((u) =>
    u.numbers.map((n) => `${u.sectionId}: ${n}`),
  );
  return {
    visuals: lesson.sections.filter((s) => s.visual).length,
    invalid: problems,
    unsupportedNumbers: unsupported,
  };
}

/** Percentage of all golden facts stated across the scored lessons. */
export function overallPercent(scores: TopicScore[]): number {
  const total = scores.reduce((s, t) => s + t.found.length + t.missing.length, 0);
  const found = scores.reduce((s, t) => s + t.found.length, 0);
  return total === 0 ? 0 : Math.round((found / total) * 1000) / 10;
}

/** Share of facts that carry a source quote (a `tested` subject needs all of them). */
export function quotedShare(golden: Golden): { quoted: number; total: number } {
  const facts = golden.topics.flatMap((t) => t.facts);
  return { quoted: facts.filter((f) => f.source).length, total: facts.length };
}

/** The trust tier a measured score earns (SPEC §12.3): it is recommended, never set silently. */
export function tierForScore(
  percent: number,
  golden: { topics: number; quoted: number; total: number },
): "verified" | "tested" | "sourced" {
  // A tested or verified subject needs ≥ 12 topics whose facts all come with fetched quotes.
  const eligible = golden.topics >= 12 && golden.total > 0 && golden.quoted === golden.total;
  if (!eligible) return "sourced";
  if (percent >= 95) return "verified";
  if (percent >= 85) return "tested";
  return "sourced";
}
