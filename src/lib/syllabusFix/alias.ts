import { z } from "zod";
import aliasData from "@/data/syllabus/aliases.json";

/*
 * Aliases for merged courses (syllabus fix, admin corrections before Phase 4). When per-branch
 * copies of one course are merged, the extra copies are retired and their ids point here at the
 * main copy, like a forwarding address after a move. Saved progress, weak topics, mock results and
 * highlights keep their old "subject/topic" ids; anything that joins them by course reads them
 * through these functions, so they count for the main copy. Nothing stored is rewritten.
 */

export const AliasesSchema = z.object({
  version: z.literal(1),
  /** Retired copy id → main copy id. */
  subjects: z.record(z.string().min(1), z.string().min(1)),
  /** "copy/chapter" → "main/chapter". */
  chapters: z.record(z.string().min(3), z.string().min(3)),
  /** "copy/topic" → "main/topic". */
  topics: z.record(z.string().min(3), z.string().min(3)),
});

export type Aliases = z.infer<typeof AliasesSchema>;

export const aliases: Aliases = AliasesSchema.parse(aliasData);

/** The main copy of a course (the id itself when it was never merged). */
export function canonicalSubject(id: string, map: Aliases = aliases): string {
  return map.subjects[id] ?? id;
}

/**
 * Where a topic of a merged course lives now. A topic with no counterpart in the main copy keeps
 * its old ids (it still resolves in the retired copy).
 */
export function canonicalTopic(
  subject: string,
  topic: string,
  map: Aliases = aliases,
): { subject: string; topic: string } {
  const hit = map.topics[`${subject}/${topic}`];
  if (!hit) return { subject, topic };
  const cut = hit.indexOf("/");
  return { subject: hit.slice(0, cut), topic: hit.slice(cut + 1) };
}

/** Where a chapter of a merged course lives now (same rule as topics). */
export function canonicalChapter(
  subject: string,
  chapter: string,
  map: Aliases = aliases,
): { subject: string; chapter: string } {
  const hit = map.chapters[`${subject}/${chapter}`];
  if (!hit) return { subject, chapter };
  const cut = hit.indexOf("/");
  return { subject: hit.slice(0, cut), chapter: hit.slice(cut + 1) };
}
