import {
  labSubjects,
  subjects as allSubjects,
  type Chapter,
  type Subject,
  type Topic,
} from "@/lib/subjects";
import { matchScore, normalize } from "@/lib/topicSearch";
import { activeChapters } from "@/lib/syllabusFix/active";

/*
 * One search box for everything (V3 · Step 3): subjects, chapters and topics across every
 * subject, like the index at the back of a whole shelf of textbooks.
 */

export type CatalogueMatch =
  | { kind: "subject"; subject: Subject }
  | { kind: "chapter"; subject: Subject; chapter: Chapter }
  | { kind: "topic"; subject: Subject; chapter: Chapter; topic: Topic };

const score = matchScore;

/** Which courses a search covers: everything, theory courses only, or labs only. */
export type SearchKind = "all" | "theory" | "labs";

/** The courses one kind of search looks through. Labs are listed only here until Phase 7B. */
export function searchScope(kind: SearchKind): readonly Subject[] {
  if (kind === "labs") return labSubjects;
  if (kind === "theory") return allSubjects.filter((s) => s.courseType !== "practical");
  // "All": every listed course, plus the labs (no lab twice once Phase 7B lists them).
  return [...allSubjects, ...labSubjects.filter((l) => !allSubjects.includes(l))];
}

export const isLabCourse = (s: Pick<Subject, "courseType">) => s.courseType === "practical";

export function searchCatalogue(
  rawQuery: string,
  limit = 10,
  subjects: readonly Subject[] = allSubjects,
): CatalogueMatch[] {
  const query = normalize(rawQuery);
  if (!query) return [];
  const words = query.split(" ");
  // Among equal scores the shorter name is the closer match ("gauss" → "Gauss's law" before
  // "Gaussian and white noise"); then catalogue order.
  const found: { match: CatalogueMatch; score: number; length: number; order: number }[] = [];
  let order = 0;
  for (const subject of subjects) {
    const sName = normalize(`${subject.name} ${subject.field}`);
    const s = score(query, words, normalize(subject.name), sName);
    // Subjects rank a little above chapters and topics with the same score.
    if (s)
      found.push({
        match: { kind: "subject", subject },
        score: s + 0.2,
        length: subject.name.length,
        order: order++,
      });
    for (const chapter of activeChapters(subject)) {
      const c = score(query, words, normalize(chapter.name), sName);
      if (c)
        found.push({
          match: { kind: "chapter", subject, chapter },
          score: c + 0.1,
          length: chapter.name.length,
          order: order++,
        });
      for (const topic of chapter.topics) {
        const t = score(query, words, normalize(topic.name), normalize(chapter.name));
        if (t)
          found.push({
            match: { kind: "topic", subject, chapter, topic },
            score: t,
            length: topic.name.length,
            order: order++,
          });
      }
    }
  }
  return found
    .sort((a, b) => b.score - a.score || a.length - b.length || a.order - b.order)
    .slice(0, limit)
    .map((f) => f.match);
}

/**
 * Where a search result leads: a subject page, or the lesson picker with it chosen. A lab's
 * experiment opens its part of the lab's page (lab lessons arrive in Phase 7B).
 */
export function matchHref(m: CatalogueMatch): string {
  if (m.kind === "subject") return `/subjects/${m.subject.id}`;
  if (m.kind === "chapter" || isLabCourse(m.subject))
    return `/subjects/${m.subject.id}#chapter-${m.chapter.id}`;
  return `/start?${new URLSearchParams({ subject: m.subject.id, chapter: m.chapter.id, topic: m.topic.id })}`;
}
