import { subjectIndexData } from "@/data/subjects/index.light.generated";
import { subjectLoaders } from "@/data/subjects/loaders.generated";
import type { Offering, Subject } from "@/lib/subjects";

/*
 * The light catalogue: every subject WITHOUT its topics (names, fields, branches, semesters, chapters
 * with topic counts). Pages that only list or search subjects use this and stay small and fast; a
 * subject's full chapters and topics are loaded on demand with loadSubject(). (Performance work.)
 */

export type IndexedChapter = { id: string; name: string; topics: number };

export type IndexedSubject = {
  id: string;
  name: string;
  field: string;
  tier: Subject["tier"];
  branches: readonly string[];
  semesters: readonly number[];
  visualSet?: string;
  teaching?: "theory" | "skill";
  links?: readonly { subject: string; chapters?: readonly string[] }[];
  offerings?: readonly Offering[];
  university?: "pdeu";
  courseCategory?: "core" | "non-core";
  chapters: readonly IndexedChapter[];
};

const everyIndexed = subjectIndexData as unknown as IndexedSubject[];

/** The subjects Prism lists: PDEU's. The older subjects stay as a topic bank (lookups only). */
export const subjectIndex: readonly IndexedSubject[] = everyIndexed.filter(
  (s) => s.university === "pdeu",
);

/** Any subject by id, including the older topic-bank subjects (saved progress still finds them). */
export function indexedSubject(id: string): IndexedSubject | undefined {
  return everyIndexed.find((s) => s.id === id);
}

/** Chapters and topics of a subject, counting chapters linked in from other subjects. */
export function countsOf(s: IndexedSubject): { chapters: number; topics: number } {
  let chapters = s.chapters.length;
  let topics = s.chapters.reduce((n, c) => n + c.topics, 0);
  for (const link of s.links ?? []) {
    const other = indexedSubject(link.subject);
    if (!other) continue;
    const picked = link.chapters
      ? other.chapters.filter((c) => link.chapters!.includes(c.id))
      : other.chapters;
    chapters += picked.length;
    topics += picked.reduce((n, c) => n + c.topics, 0);
  }
  return { chapters, topics };
}

const loaded = new Map<string, Promise<Subject | undefined>>();

/** One subject's full data, fetched the first time it is asked for (then kept). */
export function loadSubject(id: string): Promise<Subject | undefined> {
  const have = loaded.get(id);
  if (have) return have;
  const load = subjectLoaders[id];
  const promise = load ? load().then((m) => m.default as Subject) : Promise.resolve(undefined);
  loaded.set(id, promise);
  return promise;
}

export function subjectsInSemester(semester: number, branch?: string): IndexedSubject[] {
  return subjectIndex.filter(
    (s) =>
      s.semesters.includes(semester) &&
      (!branch || s.branches.includes("all") || s.branches.includes(branch)),
  );
}
