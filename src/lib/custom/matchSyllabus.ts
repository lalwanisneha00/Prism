import type { DraftChapter } from "@/lib/custom/syllabusText";
import type { Subject } from "@/lib/subjects";
import { normalize } from "@/lib/topicSearch";

/*
 * Does a student's own syllabus match a subject Prism already teaches? (V3 · Step 12.) If most
 * of their topics appear in a built-in subject, we offer that subject (verified material and
 * visuals) instead of a blank custom one. Pure and AI-free: word overlap on topic names.
 */

export type SyllabusMatch = {
  subject: Subject;
  matched: number;
  total: number;
  /** 0–1: the share of the student's topics found in the subject. */
  ratio: number;
};

const STOP = new Set([
  "and",
  "of",
  "the",
  "in",
  "to",
  "a",
  "an",
  "for",
  "with",
  "on",
  "its",
  "their",
]);

// Topic names are compared many times (every syllabus topic against every subject's topics), so a
// name's words are worked out once.
const wordCache = new Map<string, string[]>();

function words(text: string): string[] {
  const hit = wordCache.get(text);
  if (hit) return hit;
  const out = normalize(text.replace(/['’]s\b/gi, ""))
    .split(" ")
    .filter((w) => w.length > 1 && !STOP.has(w));
  if (wordCache.size > 50_000) wordCache.clear();
  wordCache.set(text, out);
  return out;
}

/** Two topic names match when one's words are (nearly) all in the other. */
export function sameTopic(a: string, b: string): boolean {
  const wa = words(a);
  const wb = words(b);
  if (wa.length === 0 || wb.length === 0) return false;
  const shared = wa.filter((w) => wb.includes(w)).length;
  return (
    shared / Math.min(wa.length, wb.length) >= 0.8 && shared / Math.max(wa.length, wb.length) >= 0.5
  );
}

export function matchSyllabus(
  draft: readonly DraftChapter[],
  catalogue: readonly Subject[],
  minTopics = 4,
  minRatio = 0.4,
): SyllabusMatch[] {
  const mine = draft.flatMap((c) => c.topics);
  if (mine.length < minTopics) return [];
  const out: SyllabusMatch[] = [];
  for (const subject of catalogue) {
    const theirs = subject.chapters.flatMap((c) => c.topics.map((t) => t.name));
    const matched = mine.filter((m) => theirs.some((t) => sameTopic(m, t))).length;
    const ratio = matched / mine.length;
    if (matched >= minTopics && ratio >= minRatio)
      out.push({ subject, matched, total: mine.length, ratio });
  }
  return out.sort((a, b) => b.ratio - a.ratio || b.matched - a.matched).slice(0, 3);
}
