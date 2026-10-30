import { findSubject, type Chapter, type Subject, type Topic } from "@/lib/subjects";
import { activeChapters } from "@/lib/syllabusFix/active";
import { normal } from "@/lib/labs/text";
import type { PracticalLesson } from "@/lib/labs/practicalSchema";

/*
 * An experiment of a lab course and what its lesson builds on (syllabus fix, Phase 7B): the lab,
 * its experiment list, and the related theory course's topics that share the experiment's words.
 */

export type Experiment = { subject: Subject; chapter: Chapter; topic: Topic };

/** A still-taught experiment of a PDEU lab, or null. */
export function findExperiment(subjectId: string, topicId: string): Experiment | null {
  const subject = findSubject(subjectId);
  if (!subject || subject.courseType !== "practical" || subject.status === "retired") return null;
  for (const chapter of activeChapters(subject)) {
    const topic = chapter.topics.find((t) => t.id === topicId);
    if (topic) return { subject, chapter, topic };
  }
  return null;
}

/** Every experiment of a lab in order, for "previous / next" links. */
export function experimentsOf(subject: Subject): { chapter: Chapter; topic: Topic }[] {
  return activeChapters(subject).flatMap((chapter) =>
    chapter.topics.map((topic) => ({ chapter, topic })),
  );
}

export type NumberedExperiment<T> = { topic: T; number: number | null };

/**
 * A lab's experiments as one student's handout numbers them. A lab shared by several branches
 * keeps one list (topic `numbers`, per branch): the student's branch comes first in its own
 * order, then experiments only other branches' handouts list (no number). Without a branch, or
 * for a lab with one numbering, the stored order and `number` are used; a number already shown
 * is not repeated.
 */
export function numberedFor<T extends { number?: number; numbers?: Record<string, number> }>(
  topics: readonly T[],
  branch: string | undefined,
): NumberedExperiment<T>[] {
  const mine = branch ? topics.filter((t) => t.numbers?.[branch] !== undefined) : [];
  if (branch && mine.length > 0) {
    const n = (t: T) => t.numbers![branch];
    return [
      ...[...mine].sort((a, b) => n(a) - n(b)).map((topic) => ({ topic, number: n(topic) })),
      ...topics.filter((t) => !mine.includes(t)).map((topic) => ({ topic, number: null })),
    ];
  }
  const seen = new Set<number>();
  return topics.map((topic, i) => {
    const number = topic.number ?? i + 1;
    if (seen.has(number)) return { topic, number: null };
    seen.add(number);
    return { topic, number };
  });
}

const STOP = new Set(
  "the and for with from using study determine determination measure measurement verify verification experiment given find their that this into each between".split(
    " ",
  ),
);
const words = (s: string) =>
  normal(s)
    .trim()
    .split(" ")
    .filter((w) => w.length >= 4 && !STOP.has(w))
    .map((w) => w.replace(/(ies|es|s)$/, ""));

/**
 * Up to four topics of the lab's related theory course(s) that share the most words with the
 * experiment (at least 8 letters' worth, so a single short word is not enough).
 */
export function theoryLinksFor(
  lab: Subject,
  experiment: Topic,
): NonNullable<PracticalLesson["meta"]["theoryLinks"]> {
  const own = new Set(words(`${experiment.name} ${experiment.aim ?? ""}`));
  if (own.size === 0) return [];
  const scored: { subject: string; chapter: string; topic: string; name: string; score: number }[] =
    [];
  for (const id of lab.relatedCourses ?? []) {
    const theory = findSubject(id);
    if (!theory || theory.courseType === "practical" || theory.status === "retired") continue;
    for (const chapter of activeChapters(theory))
      for (const t of chapter.topics) {
        const score = words(t.name)
          .filter((w) => own.has(w))
          .reduce((sum, w) => sum + w.length, 0);
        if (score >= 8)
          scored.push({
            subject: theory.id,
            chapter: chapter.id,
            topic: t.id,
            name: t.name,
            score,
          });
      }
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((s) => ({ subject: s.subject, chapter: s.chapter, topic: s.topic, name: s.name }));
}
