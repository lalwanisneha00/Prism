import { z } from "zod";
import type { Lesson } from "@/lib/schema";

/*
 * Scoring for the golden set (SPEC §6.5). A fact counts as "stated" when its pattern
 * appears in the lesson. It is a proxy for accuracy: it checks that the key facts are
 * present and written in their standard form, alongside the schema, maths and fact-check.
 */

export const GoldenSchema = z.object({
  description: z.string(),
  subject: z.string(),
  topics: z
    .array(
      z.object({
        topic: z.string(),
        chapter: z.string(),
        facts: z.array(z.object({ id: z.string(), claim: z.string(), pattern: z.string() })).min(1),
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

/** Lower-case, LaTeX backslashes and braces removed, spaces collapsed. */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/\\/g, "")
    .replace(/[{}]/g, "")
    .replace(/[ \t]+/g, " ");
}

export type TopicScore = { topic: string; found: string[]; missing: string[] };

export function scoreLesson(lesson: Lesson, entry: GoldenTopic): TopicScore {
  const text = normalizeForMatch(lessonText(lesson));
  const found: string[] = [];
  const missing: string[] = [];
  for (const fact of entry.facts) {
    (new RegExp(fact.pattern, "i").test(text) ? found : missing).push(fact.id);
  }
  return { topic: entry.topic, found, missing };
}

/** Percentage of all golden facts stated across the scored lessons. */
export function overallPercent(scores: TopicScore[]): number {
  const total = scores.reduce((s, t) => s + t.found.length + t.missing.length, 0);
  const found = scores.reduce((s, t) => s + t.found.length, 0);
  return total === 0 ? 0 : Math.round((found / total) * 1000) / 10;
}
