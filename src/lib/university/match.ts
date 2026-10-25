import { sameTopic } from "@/lib/custom/matchSyllabus";
import type { UniSubject } from "@/lib/university/parse";
import type { Subject } from "@/lib/subjects";
import { normalize } from "@/lib/topicSearch";

/*
 * Which built-in subject is each subject of the student's university syllabus, and which of its
 * chapters and topics does the university actually teach? (V3 · Step 12.) Pure and AI-free: word
 * overlap on names, with the topic lists as a second opinion. Nothing here is applied until the
 * student has reviewed it.
 */

/** Chapter id → the topic ids the university teaches in it. A chapter that is absent is not taught. */
export type SubjectScope = Record<string, string[]>;
/** Subject id → its scope. */
export type SubjectScopes = Record<string, SubjectScope>;

/** Words that do not tell two subject names apart ("Engineering Physics" ≈ "Applied Physics I"). */
const FILLER = new Set([
  "engineering",
  "engg",
  "applied",
  "basic",
  "basics",
  "introduction",
  "intro",
  "fundamentals",
  "principles",
  "foundations",
  "of",
  "and",
  "to",
  "the",
  "in",
  "for",
  "i",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
  "1",
  "2",
  "3",
  "4",
  "lab",
  "laboratory",
  "theory",
]);

/**
 * One form for singular and plural ("machines" → "machine", "antennas" → "antenna",
 * "batteries" → "battery"), so "Dynamics of Machines" matches "Dynamics of Machine". Words that
 * only look plural ("analysis", "process", "dynamics" vs "dynamic") end up the same on both sides.
 */
export function singular(word: string): string {
  if (word.length <= 3 || /(?:ss|us|is)$/.test(word)) return word;
  if (/ies$/.test(word)) return `${word.slice(0, -3)}y`;
  if (/(?:ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

function contentWords(name: string): string[] {
  return normalize(name)
    .split(" ")
    .filter((w) => w.length > 0 && !FILLER.has(w))
    .map(singular);
}

/** 0–1: the share of meaningful words the two names have in common. */
const SERIES: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6 };

/** "Mathematics – III" → {3}: the number of a course in a series. */
function seriesNumbers(name: string): Set<number> {
  const out = new Set<number>();
  for (const w of normalize(name).split(" ")) {
    if (/^[1-6]$/.test(w)) out.add(Number(w));
    else if (w in SERIES) out.add(SERIES[w]);
  }
  return out;
}

export function nameSimilarity(a: string, b: string): number {
  // Numbers are ignored as words ("Applied Physics I" ≈ "Engineering Physics"), but two courses
  // of one series are different courses: "Mathematics I" is not "Mathematics III".
  const na = seriesNumbers(a);
  const nb = seriesNumbers(b);
  if (na.size && nb.size && ![...na].some((n) => nb.has(n))) return 0;
  const wa = contentWords(a);
  const wb = contentWords(b);
  if (wa.length === 0 || wb.length === 0) return 0;
  const shared = wa.filter((w) => wb.includes(w)).length;
  return shared / Math.max(wa.length, wb.length);
}

/** Everything the university lists for a subject, unit names and topics together. */
function listed(uni: UniSubject): string[] {
  return uni.units.flatMap((u) => [u.name, ...u.topics]).filter((t) => t.trim().length > 0);
}

/** A topic is taught when the university lists something that means the same. */
function covers(texts: readonly string[], name: string): boolean {
  return texts.some((t) => sameTopic(t, name));
}

/** The built-in topics the university lists, over all the topics of the subject. */
export function topicCoverage(subject: Subject, uni: UniSubject): number {
  const texts = listed(uni);
  const all = subject.chapters.flatMap((c) => c.topics);
  if (all.length === 0) return 0;
  return all.filter((t) => covers(texts, t.name)).length / all.length;
}

export type Candidate = { subject: Subject; score: number };

export type SubjectMatch = {
  uni: UniSubject;
  /** The best built-in subject, when the match is convincing; otherwise null (a subject of the student's own). */
  best: Candidate | null;
  /** Other plausible subjects, best first, for the student to choose from. */
  others: Candidate[];
};

const NAME_MATCH = 0.6;
const MIN_TOPICS_FOR_COVERAGE = 4;

/** Tie-break for equal scores: the same printed name first, then the better topic coverage. */
type TieBreak = { exact: number; cov: number };

function scoreFor(subject: Subject, uni: UniSubject): { score: number } & TieBreak {
  const name = nameSimilarity(subject.name, uni.name);
  // Topic overlap can rescue a differently named subject, but needs real evidence.
  const texts = listed(uni);
  const hits = subject.chapters
    .flatMap((c) => c.topics)
    .filter((t) => covers(texts, t.name)).length;
  const raw = topicCoverage(subject, uni);
  const cov = hits >= MIN_TOPICS_FOR_COVERAGE ? raw : 0;
  const exact = normalize(subject.name) === normalize(uni.name) ? 1 : 0;
  return { score: Math.max(name, cov >= 0.35 ? 0.5 + cov / 2 : 0), exact, cov: raw };
}

export function matchSubject(uni: UniSubject, catalogue: readonly Subject[]): SubjectMatch {
  const ranked = catalogue
    .map((subject) => ({ subject, ...scoreFor(subject, uni) }))
    .filter((c) => c.score >= 0.4)
    // Equal scores ("Physics", "Applied Physics": filler words are ignored) → the same printed
    // name, then the best topic coverage, not whichever comes first in the catalogue.
    .sort((a, b) => b.score - a.score || b.exact - a.exact || b.cov - a.cov)
    .map(({ subject, score }) => ({ subject, score }));
  const best = ranked[0] && ranked[0].score >= NAME_MATCH ? ranked[0] : null;
  return { uni, best, others: ranked.filter((c) => c !== best).slice(0, 3) };
}

/**
 * Which chapters and topics of a built-in subject the university teaches, from one or more of its
 * syllabus entries (the same subject can span two semesters). Undefined when the syllabus lists
 * too little to say anything (then everything stays).
 */
export function scopeFor(subject: Subject, unis: readonly UniSubject[]): SubjectScope | undefined {
  const texts = unis.flatMap(listed);
  const unitNames = unis.flatMap((u) => u.units.map((x) => x.name));
  const topicCount = texts.length;
  if (topicCount < MIN_TOPICS_FOR_COVERAGE) return undefined;
  const scope: SubjectScope = {};
  for (const chapter of subject.chapters) {
    const matched = chapter.topics.filter((t) => covers(texts, t.name));
    const chapterNamed = covers(unitNames, chapter.name);
    if (matched.length === 0 && !chapterNamed) continue; // the university does not teach this chapter
    // When most of a chapter is listed, the unlisted topics are left out too; otherwise every
    // topic stays (a short list is more likely a different wording than a real omission).
    const share = chapter.topics.length ? matched.length / chapter.topics.length : 1;
    scope[chapter.id] =
      matched.length > 0 && share >= 0.6
        ? matched.map((t) => t.id)
        : chapter.topics.map((t) => t.id);
  }
  // Nothing matched at all: the syllabus is worded too differently to scope anything.
  return Object.keys(scope).length > 0 ? scope : undefined;
}

/** The subject as the university teaches it: only the chosen chapters and topics. */
export function applyScope(subject: Subject, scope: SubjectScope | undefined): Subject {
  if (!scope) return subject;
  const keptTopics = new Set(Object.values(scope).flat());
  return {
    ...subject,
    chapters: subject.chapters
      .filter((c) => scope[c.id])
      .map((c) => ({
        ...c,
        topics: c.topics
          .filter((t) => scope[c.id].includes(t.id))
          .map((t) => ({
            ...t,
            requires: t.requires?.filter((r) => keptTopics.has(r)),
          })),
      })),
  };
}

/** How much of a subject the scope hides, for the "N topics hidden" notice. */
export function hiddenCount(subject: Subject, scope: SubjectScope | undefined): number {
  if (!scope) return 0;
  const total = subject.chapters.reduce((n, c) => n + c.topics.length, 0);
  const kept = Object.values(scope).reduce((n, ids) => n + ids.length, 0);
  return Math.max(0, total - kept);
}

/** Merges the scopes of several university entries for the same subject (a topic taught in either stays). */
export function mergeScopes(
  a: SubjectScope | undefined,
  b: SubjectScope | undefined,
): SubjectScope | undefined {
  if (!a || !b) return undefined; // one entry leaves everything, so the subject is unrestricted
  const out: SubjectScope = { ...a };
  for (const [chapter, ids] of Object.entries(b)) {
    out[chapter] = [...new Set([...(out[chapter] ?? []), ...ids])];
  }
  return out;
}
