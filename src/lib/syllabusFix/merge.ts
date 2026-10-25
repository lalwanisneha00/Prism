import { sameTopic } from "@/lib/custom/matchSyllabus";

/*
 * Merging per-branch copies of one course (syllabus fix, admin corrections before Phase 4). The old
 * data copied common first-year courses once per branch ("Indian Knowledge System (Petro)",
 * "... (Biotech)"). A merge keeps the most complete copy as the main one, links every branch to it,
 * and retires the other copies softly with an alias, so saved progress on them still finds its topic.
 */

export type CopyTopic = { id: string; name: string };
export type CopyChapter = { id: string; name: string; topics: CopyTopic[] };

/** What the rules need to know about one copy (active chapters and topics only). */
export type CourseCopy = {
  id: string;
  name: string;
  /** Real course codes of the copy and its offerings (placeholders like 24ICxxxT left out). */
  codes: string[];
  nonCore: boolean;
  verified: boolean;
  offerings: number;
  chapters: CopyChapter[];
};

/** Owner's rule for core courses: merge at this topic overlap, or with the same course code. */
export const MERGE_OVERLAP = 0.8;
/**
 * A shared code with less overlap than this means the copies teach different syllabi (Phase 2's
 * CROSS_BRANCH_OVERLAP rule). Those are listed for the owner instead of merged.
 */
export const SAME_CODE_MIN_OVERLAP = 0.5;

/** A printed code that identifies a course (not "UG_1_T", "24ICxxxT", "24ECE***T"). */
export function isRealCode(code: string | null | undefined): code is string {
  return !!code && !code.startsWith("UG_") && !/[xX*]/.test(code.slice(4)) && !/\s/.test(code);
}

/** "Indian Knowledge System (Petro)" → "Indian Knowledge System". Keeps other brackets. */
export function plainCourseName(name: string): string {
  const BRANCH = /^(?:cs|ce|ict|ece|ec|ee|me|mech|civil|petro|biotech|chem|elec|for [a-z ,/&]+)$/i;
  const m = /^(.*\S)\s*\(([^()]*)\)\s*$/.exec(name);
  if (!m) return name;
  const parts = m[2].split(/\s*[,/&]\s*|\s+and\s+/).filter(Boolean);
  return parts.length > 0 && parts.every((p) => BRANCH.test(p.trim())) ? m[1] : name;
}

function topicNames(c: CourseCopy): string[] {
  return c.chapters.flatMap((ch) => ch.topics.map((t) => t.name));
}

/** Share of `a`'s topics that `b` also lists. */
function oneWay(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0) return b.length === 0 ? 1 : 0;
  return a.filter((t) => b.some((n) => sameTopic(t, n))).length / a.length;
}

/** Topic overlap both ways round (the smaller share), so a short copy cannot hide in a long one. */
export function topicOverlap(a: CourseCopy, b: CourseCopy): number {
  const ta = topicNames(a);
  const tb = topicNames(b);
  return Math.min(oneWay(ta, tb), oneWay(tb, ta));
}

export function sharedCode(a: CourseCopy, b: CourseCopy): string | undefined {
  return a.codes.find((c) => b.codes.includes(c));
}

function size(c: CourseCopy): [number, number] {
  return [c.chapters.reduce((n, ch) => n + ch.topics.length, 0), c.chapters.length];
}

/** The most complete copy: most topics, then most units, then verified, then most branches. */
export function pickMain(copies: readonly CourseCopy[]): CourseCopy {
  const score = (c: CourseCopy) => [...size(c), c.verified ? 1 : 0, c.offerings];
  return [...copies].sort((x, y) => {
    const sx = score(x);
    const sy = score(y);
    for (let i = 0; i < sx.length; i++) if (sx[i] !== sy[i]) return sy[i] - sx[i];
    return x.id.localeCompare(y.id);
  })[0];
}

export type MergeVerdict = {
  merge: boolean;
  why: "non-core" | "same code" | "overlap" | "same code, different syllabus" | "below threshold";
  overlap: number;
  code?: string;
};

/** Names this alike (after dropping branch labels) are the same non-core course. */
export const SAME_NAME = 0.85;

/**
 * Should `copy` merge into `main`? Non-core first-year courses have one syllabus for every branch
 * (owner's decision), so the same course (same code or name) always merges. Core courses need the
 * same code or 80% topic overlap. `nameSim` is the similarity of the two plain names.
 */
export function mergeVerdict(main: CourseCopy, copy: CourseCopy, nameSim: number): MergeVerdict {
  const overlap = topicOverlap(main, copy);
  const code = sharedCode(main, copy);
  if (main.nonCore && copy.nonCore && (code || nameSim >= SAME_NAME))
    return { merge: true, why: "non-core", overlap, code };
  if (overlap >= MERGE_OVERLAP) return { merge: true, why: "overlap", overlap, code };
  if (code && overlap >= SAME_CODE_MIN_OVERLAP)
    return { merge: true, why: "same code", overlap, code };
  if (code) return { merge: false, why: "same code, different syllabus", overlap, code };
  return { merge: false, why: "below threshold", overlap };
}

export type CopyAliases = {
  chapters: Record<string, string>;
  topics: Record<string, string>;
};

/**
 * Where each chapter and topic of a retired copy lives in the main copy: the same id when the main
 * has it, otherwise the main's topic with the same meaning. Anything with no counterpart is left
 * out and keeps resolving in the retired copy itself.
 */
export function copyAliases(copy: CourseCopy, main: CourseCopy): CopyAliases {
  const chapters: Record<string, string> = {};
  const topics: Record<string, string> = {};
  const mainTopics = main.chapters.flatMap((c) => c.topics);
  const mainTopicIds = new Set(mainTopics.map((t) => t.id));
  for (const ch of copy.chapters) {
    const same =
      main.chapters.find((m) => m.id === ch.id) ??
      main.chapters.find((m) => sameTopic(m.name, ch.name));
    if (same) chapters[ch.id] = same.id;
    for (const t of ch.topics) {
      if (mainTopicIds.has(t.id)) topics[t.id] = t.id;
      else {
        const hit = mainTopics.find((m) => sameTopic(m.name, t.name));
        if (hit) topics[t.id] = hit.id;
      }
    }
  }
  return { chapters, topics };
}
