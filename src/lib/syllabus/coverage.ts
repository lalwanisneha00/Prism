import { countsOf, indexedSubject } from "@/lib/catalogue";
import { isSequenced } from "@/lib/syllabus/propose";
import type { StoredSubject, SyllabusByTerm } from "@/lib/syllabus/types";

/*
 * What the student's uploaded syllabus says about each topic of a Prism subject. Topics are never
 * removed: the ones outside the syllabus stay visible with a note. A subject that colleges split
 * over semesters ("Mathematics I", "Mathematics II") fills up as more semesters are uploaded: each
 * topic is recorded against the semester and subject that covers it. Derived on the fly from the
 * stored syllabus, so it is always consistent with it. Personal to the student; Prism's own subject
 * data is never changed.
 */

export const NOTE_OUTSIDE =
  "Not in your syllabus, but you can study this for a better understanding of the subject.";
export const NOTE_LATER = "Not in this semester's syllabus. May come in a later semester.";

export type TopicState =
  { state: "in"; semester: number; name: string } | { state: "later" } | { state: "outside" };

export type CoverageEntry = {
  semester: number;
  name: string;
  code?: string;
  credits?: number;
  topicCount: number;
  outcomes: string[];
  covered: ReadonlySet<string>;
  extra: string[];
};

export type SubjectCoverage = {
  subjectId: string;
  /** "split" when the subject is taught in parts (several entries, "… I / II", or only part covered). */
  mode: "whole" | "split";
  entries: CoverageEntry[];
  /** How many of the subject's topics are in the student's syllabus. */
  coveredCount: number;
  totalTopics: number;
  /** The state of one topic, by "ownerSubject/topicId". */
  stateOf: (topicKey: string) => TopicState;
  /** The note to show next to a topic, or null when it needs none. */
  noteOf: (topicKey: string) => string | null;
};

/** The student's coverage of one Prism subject, or null when no uploaded syllabus covers it. */
export function coverageFor(
  subjectId: string,
  syllabus: SyllabusByTerm | undefined,
): SubjectCoverage | null {
  const entries: CoverageEntry[] = [];
  for (const term of Object.values(syllabus ?? {})) {
    for (const s of term.subjects) {
      if (s.match.kind !== "prism" || s.match.subjectId !== subjectId) continue;
      entries.push({
        semester: term.semester,
        name: s.name,
        code: s.code,
        credits: s.credits,
        topicCount: s.topicCount,
        outcomes: s.outcomes,
        covered: new Set(s.match.covered),
        extra: s.match.extra,
      });
    }
  }
  if (entries.length === 0) return null;
  entries.sort((a, b) => a.semester - b.semester);

  const indexed = indexedSubject(subjectId);
  const totalTopics = indexed ? countsOf(indexed).topics : 0;
  const union = new Set(entries.flatMap((e) => [...e.covered]));
  const split = entries.length >= 2 || entries.some((e) => isSequenced(e.name));

  const stateOf = (key: string): TopicState => {
    const hit = entries.find((e) => e.covered.has(key));
    if (hit) return { state: "in", semester: hit.semester, name: hit.name };
    return split ? { state: "later" } : { state: "outside" };
  };
  return {
    subjectId,
    mode: split ? "split" : "whole",
    entries,
    coveredCount: union.size,
    totalTopics,
    stateOf,
    noteOf: (key) => {
      const s = stateOf(key);
      return s.state === "later" ? NOTE_LATER : s.state === "outside" ? NOTE_OUTSIDE : null;
    },
  };
}

/** Where a topic is covered, for a small line like "Covered in Semester 2: Mathematics II". */
export function coveredIn(state: TopicState): string | null {
  return state.state === "in" ? `Semester ${state.semester}: ${state.name}` : null;
}

/** Syllabus topics Prism does not have yet, per syllabus subject (with its semester). */
export function missingFromPrism(
  syllabus: SyllabusByTerm | undefined,
  subjectId: string,
): { semester: number; name: string; topics: string[] }[] {
  return (coverageFor(subjectId, syllabus)?.entries ?? [])
    .filter((e) => e.extra.length > 0)
    .map((e) => ({ semester: e.semester, name: e.name, topics: e.extra }));
}

/**
 * What the student's course outcomes ask of a topic: used to set the depth and emphasis of that
 * student's lesson. Only for topics the syllabus actually covers.
 */
export function emphasisFor(
  syllabus: SyllabusByTerm | undefined,
  subjectId: string,
  topicKey: string,
): { subjectName: string; outcomes: string[] } | null {
  const cov = coverageFor(subjectId, syllabus);
  const entry = cov?.entries.find((e) => e.covered.has(topicKey));
  if (!entry || entry.outcomes.length === 0) return null;
  return { subjectName: entry.name, outcomes: entry.outcomes.slice(0, 8) };
}

/** Stored subjects of one semester that are not on Prism, for the "upload faculty material" note. */
export function ownSubjects(
  syllabus: SyllabusByTerm | undefined,
  semester: number,
): StoredSubject[] {
  return (syllabus?.[String(semester)]?.subjects ?? []).filter((s) => s.match.kind === "own");
}
