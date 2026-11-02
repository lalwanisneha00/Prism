import type { Subject } from "@/lib/subjects";
import { activeChapters } from "@/lib/syllabusFix/active";

/*
 * The syllabus boundary of a mock paper (mock quality upgrade): the chosen topics with their
 * units, and the course's other topics that are NOT in this paper. The writer and the examiner
 * both get both sides, so "related" is never mistaken for "in the syllabus".
 */

export type BoundaryTopic = { id: string; name: string; unit: string };

export type Boundary = {
  /** "Computer Programming - I, PDEU B.Tech, semester 1" */
  course: string;
  /** Every topic of the course (live syllabus fixes applied), by id. */
  all: ReadonlyMap<string, BoundaryTopic>;
  /** The chosen topics. */
  inside: BoundaryTopic[];
  /** The course's other topics as "name (unit)", capped for prompt size. */
  outside: string[];
};

/** Most "not in this paper" topics listed (the nearest units come first). */
const OUTSIDE_LIMIT = 80;

export function courseLine(subject: Pick<Subject, "name" | "university" | "semesters">): string {
  const where = subject.university === "pdeu" ? "PDEU B.Tech" : "B.Tech";
  const sem = subject.semesters.length ? `, semester ${subject.semesters.join("/")}` : "";
  return `${subject.name}, ${where}${sem}`;
}

export function boundaryFor(subject: Subject, scope: readonly string[]): Boundary {
  const chapters = activeChapters(subject);
  const all = new Map(
    chapters.flatMap((c) =>
      c.topics.map((t) => [t.id, { id: t.id, name: t.name, unit: c.name }] as const),
    ),
  );
  const chosen = new Set(scope);
  const inside = scope.flatMap((id) => {
    const t = all.get(id);
    return t ? [t] : [];
  });
  // Topics of the units in the paper first (the easiest to confuse), then the other units.
  const units = new Set(inside.map((t) => t.unit));
  const others = [...all.values()].filter((t) => !chosen.has(t.id));
  const outside = [
    ...others.filter((t) => units.has(t.unit)),
    ...others.filter((t) => !units.has(t.unit)),
  ]
    .slice(0, OUTSIDE_LIMIT)
    .map((t) => `${t.name} (${t.unit})`);
  return { course: courseLine(subject), all, inside, outside };
}
