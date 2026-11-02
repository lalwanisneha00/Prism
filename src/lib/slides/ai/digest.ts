import type { Lesson } from "@/lib/schema";
import type { VisualRequest } from "@/lib/slides/plan";
import { clip, plainText } from "@/lib/slides/text";

/*
 * What the deck writer is given to work from (deck quality overhaul): the topic's checked lesson,
 * squeezed into plain text with its facts, formulas, worked examples, misconceptions and
 * analogies, plus the lesson's own visuals by key. Like handing a teacher the textbook chapter
 * before they make slides: the deck may explain more, but it starts from checked material.
 */

/** A lesson visual the writer may reuse by key ("L1V2" = lesson 1, visual 2). */
export type LessonVisual = { key: string; caption: string; request: VisualRequest };

/** Most characters of one topic's digest (a chapter deck sends one per topic). */
export const DIGEST_CHARS = 5000;

const p = (s: string, max = 400) => clip(plainText(s), max);

/** One topic's lesson as compact text for the prompt. */
export function lessonDigest(lesson: Lesson, max = DIGEST_CHARS): string {
  const parts: string[] = [`TOPIC: ${lesson.meta.title}`, `Hook: ${p(lesson.hook, 300)}`];
  if (lesson.prerequisites.length)
    parts.push(
      `Prerequisites: ${lesson.prerequisites.map((x) => `${x.concept} (${p(x.oneLiner, 120)})`).join("; ")}`,
    );
  for (const s of lesson.sections) parts.push(`## ${s.title}\n${p(s.body, 700)}`);
  for (const a of lesson.analogies)
    parts.push(
      `Analogy for ${a.concept}: ${p(a.analogy, 250)} (breaks down: ${p(a.whereItBreaks, 150)})`,
    );
  for (const w of lesson.workedExamples)
    parts.push(
      `Worked example: ${p(w.problem, 300)} Steps: ${w.steps.map((x) => p(x, 160)).join(" | ")} Answer: ${p(w.answer, 160)}`,
    );
  for (const m of lesson.misconceptions)
    parts.push(
      `Misconception: "${p(m.wrong, 160)}" Right: ${p(m.right, 160)} Why: ${p(m.why, 160)}`,
    );
  if (lesson.revisionSheet.formulas.length)
    parts.push(
      `Formulas (LaTeX): ${lesson.revisionSheet.formulas.map((f) => `$${f}$`).join(" ; ")}`,
    );
  parts.push(`Key points: ${lesson.revisionSheet.keyPoints.map((k) => p(k, 160)).join(" | ")}`);
  for (const q of lesson.quiz.slice(0, 4))
    parts.push(`Quiz (${q.difficulty}): ${p(q.question, 200)} → ${p(q.answer, 120)}`);
  const text = parts.join("\n");
  return text.length <= max ? text : text.slice(0, max);
}

/** The lessons' own checked visuals, by key, for the writer to reuse. */
export function lessonVisuals(lessons: readonly Lesson[]): LessonVisual[] {
  return lessons.flatMap((l, li) =>
    l.sections.flatMap((s, si) =>
      s.visual && s.visual.type !== "phet"
        ? [
            {
              key: `L${li + 1}V${si + 1}`,
              caption: clip(plainText(s.visual.caption), 160),
              request: { kind: "visual" as const, spec: s.visual },
            },
          ]
        : [],
    ),
  );
}
