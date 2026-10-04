import type { LevelSlug } from "@/data/levels";
import { tokenize } from "@/lib/notes/retrieval";
import { studyOrder } from "@/lib/planner/plan";
import type { Chapter, Topic } from "@/lib/subjects";
import { splitPaper } from "@/lib/worksheet/splitPaper";

/*
 * How long a whole-chapter (or several-topic) lesson should take (V2.5 · Step 3).
 * Like planning a trip: the distance (how many topics), the terrain (how much each topic
 * builds on), how often the road is used (previous-year papers) and how well you already
 * know it (completed and weak topics) decide the time. Every number shown to the student
 * comes from a factor we really measured; nothing (like exam weightage) is invented.
 */

export type ChapterSize = "small" | "medium" | "large";
export type TimeOptionName = "quick" | "standard" | "thorough";

export type TimeOption = {
  name: TimeOptionName;
  label: string;
  minutes: number;
  /** Set when the lesson is too long for one sitting: minutes of each part. */
  parts?: number[];
};

export type PaperStats = {
  /** How many uploaded previous-year papers there are for this subject. */
  total: number;
  /** In how many of them a question is about this chapter (the chosen topics). */
  withChapter: number;
  /** Marks of those questions, when the papers print marks. */
  marks: number;
  /** Questions per topic id. */
  topicHits: Record<string, number>;
};

export type LoadInput = {
  /** The topics chosen (the whole chapter, or the ticked ones). */
  topics: Topic[];
  /** Every topic of the subject, to measure how much each one builds on. */
  allTopics: Topic[];
  level: LevelSlug;
  /** Syllabus teaching hours / marks for the unit, when the subject data has them. */
  hours?: number;
  marks?: number;
  papers?: PaperStats;
  /** Passages of the student's own materials that match these topics. */
  materialPassages?: number;
  completed?: ReadonlySet<string>;
  weak?: ReadonlySet<string>;
  /** Topics the engine expects to be tough (they build on something the student found hard). */
  tough?: ReadonlySet<string>;
};

export type ChapterEstimate = {
  size: ChapterSize;
  options: TimeOption[];
  recommended: TimeOptionName;
  /** The factors actually used, in plain words, for the "Why these timings?" note. */
  factors: string[];
  /** True when there were no papers or syllabus hours/marks: size and difficulty only. */
  sizeOnly: boolean;
};

/** The longest single sitting; longer lessons are offered as Part 1 and Part 2. */
export const MAX_SITTING_MINUTES = 90;

/** Starting points for a first-time lesson; revision levels scale these down. */
const BASE: Record<ChapterSize, [number, number, number]> = {
  small: [20, 30, 45],
  medium: [30, 45, 60],
  large: [45, 60, 90],
};
const LEVEL_SCALE: Record<LevelSlug, number> = {
  "first-encounter": 1,
  "building-blocks": 1,
  "second-chance": 1,
  "deep-dive": 1.2,
  "exam-prep": 0.67,
  "last-minute": 0.45,
};
const LEARNING_LEVELS = new Set<LevelSlug>([
  "first-encounter",
  "building-blocks",
  "second-chance",
  "deep-dive",
]);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

/** How many earlier topics a topic rests on, directly or indirectly (a difficulty proxy). */
export function prerequisiteDepth(topicId: string, allTopics: readonly Topic[]): number {
  const byId = new Map(allTopics.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const stack = [...(byId.get(topicId)?.requires ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(byId.get(id)?.requires ?? []));
  }
  return seen.size;
}

/** The load score: roughly "topics worth of work", adjusted for difficulty and the student. */
export function loadScore(input: LoadInput): number {
  const completed = input.completed ?? new Set();
  const weak = input.weak ?? new Set();
  let score = 0;
  for (const t of input.topics) {
    const depth = prerequisiteDepth(t.id, input.allTopics);
    let w = 1 + Math.min(depth, 6) * 0.06; // deeper topics are harder
    if (completed.has(t.id) && !weak.has(t.id)) w *= 0.4; // a short recap
    if (weak.has(t.id)) w *= 1.3;
    else if (input.tough?.has(t.id)) w *= 1.15;
    score += w;
  }
  // Syllabus hours, when known, are the teacher's own estimate of size: blend them in.
  if (input.hours && input.hours > 0) score = (score + input.hours * 0.8) / 2;
  // A chapter that keeps coming up in the student's papers deserves more time.
  const p = input.papers;
  if (p && p.total > 0) score *= 1 + 0.25 * (p.withChapter / p.total);
  return score;
}

export function sizeOf(score: number): ChapterSize {
  if (score <= 4) return "small";
  if (score <= 8) return "medium";
  return "large";
}

export function estimateChapter(input: LoadInput): ChapterEstimate {
  const score = loadScore(input);
  const size = sizeOf(score);
  const scale = LEVEL_SCALE[input.level];
  const names: TimeOptionName[] = ["quick", "standard", "thorough"];
  const labels = { quick: "Quick", standard: "Standard", thorough: "Thorough" };
  const options = BASE[size].map((m, i): TimeOption => {
    const minutes = round5(m * scale);
    const option: TimeOption = { name: names[i], label: labels[names[i]], minutes };
    if (minutes > MAX_SITTING_MINUTES) {
      const first = round5(minutes / 2);
      option.parts = [first, minutes - first];
    }
    return option;
  });

  const completed = input.topics.filter((t) => input.completed?.has(t.id)).length;
  const weak = input.topics.filter((t) => input.weak?.has(t.id)).length;
  let recommended: TimeOptionName = "standard";
  if (input.level === "last-minute" || completed > input.topics.length / 2) recommended = "quick";
  else if (weak > 0 || input.level === "deep-dive") recommended = "thorough";

  const factors = [plural(input.topics.length, "topic")];
  if (input.hours) factors.push(`${plural(input.hours, "syllabus hour")}`);
  if (input.marks) factors.push(`${input.marks} marks in the syllabus`);
  const p = input.papers;
  if (p && p.total > 0) {
    factors.push(
      p.withChapter > 0
        ? `appears in ${p.withChapter} of your ${plural(p.total, "uploaded paper")}${p.marks ? ` (${p.marks} marks)` : ""}`
        : `not found in your ${plural(p.total, "uploaded paper")}`,
    );
  }
  const deepest = Math.max(0, ...input.topics.map((t) => prerequisiteDepth(t.id, input.allTopics)));
  if (deepest > 0) factors.push(`builds on up to ${plural(deepest, "earlier topic")}`);
  if (completed) factors.push(`${plural(completed, "topic")} you've studied (short recap)`);
  if (weak) factors.push(`${plural(weak, "weak topic")} (more time)`);
  const tough = input.topics.filter((t) => input.tough?.has(t.id) && !input.weak?.has(t.id)).length;
  if (tough) factors.push(`${plural(tough, "topic")} that may need extra time`);
  if (input.materialPassages) {
    factors.push(`your materials cover it (${plural(input.materialPassages, "passage")})`);
  }
  return {
    size,
    options,
    recommended,
    factors,
    sizeOnly: !input.hours && !input.marks && !(p && p.total > 0),
  };
}

/* ---------- Previous-year papers ---------- */

/**
 * How often the chosen topics come up in the student's previous-year papers. A question
 * counts for a topic when it uses at least two of the words that are special to that topic
 * (words shared by every chapter, like "law", don't count).
 */
export function paperStats(
  papers: readonly string[],
  topics: readonly Topic[],
  chapters: readonly Chapter[],
): PaperStats {
  const everywhere = new Map<string, number>();
  for (const c of chapters) {
    for (const w of new Set(tokenize(c.topics.map((t) => t.name).join(" ")))) {
      everywhere.set(w, (everywhere.get(w) ?? 0) + 1);
    }
  }
  const special = (t: Topic) =>
    new Set(tokenize(t.name).filter((w) => (everywhere.get(w) ?? 0) <= 1 && w.length > 2));
  const topicWords = topics.map((t) => ({ id: t.id, words: special(t) }));

  const stats: PaperStats = { total: papers.length, withChapter: 0, marks: 0, topicHits: {} };
  for (const paper of papers) {
    let found = false;
    for (const question of splitPaper(paper)) {
      const words = new Set(tokenize(question));
      const hit = topicWords.find(
        (t) =>
          t.words.size > 0 &&
          [...t.words].filter((w) => words.has(w)).length >= Math.min(2, t.words.size),
      );
      if (!hit) continue;
      found = true;
      stats.topicHits[hit.id] = (stats.topicHits[hit.id] ?? 0) + 1;
      const marks = /\(\s*(\d{1,2})\s*(?:m|marks?)\s*\)|\[\s*(\d{1,2})\s*\]/i.exec(question);
      if (marks) stats.marks += Number(marks[1] ?? marks[2]);
    }
    if (found) stats.withChapter++;
  }
  return stats;
}

/* ---------- Splitting the time across topics ---------- */

export type TopicPlan = {
  id: string;
  name: string;
  minutes: number;
  /** A short recap of a topic the student has already studied. */
  recap: boolean;
  skipped: boolean;
};

/** The fewest minutes a topic gets (a recap still needs a few minutes). */
export const MIN_TOPIC_MINUTES = 3;

/**
 * Shares the chosen time out by importance, not equally: harder, weaker and often-examined
 * topics get more; completed ones a short recap. Learning levels keep prerequisite order;
 * Exam Prep and Last-Minute put the most important topics first.
 */
export function planTopics(input: LoadInput, totalMinutes: number): TopicPlan[] {
  const completed = input.completed ?? new Set();
  const weak = input.weak ?? new Set();
  const hits = input.papers?.topicHits ?? {};
  const maxHits = Math.max(1, ...Object.values(hits));
  const weight = (t: Topic) => {
    let w = 1 + Math.min(prerequisiteDepth(t.id, input.allTopics), 6) * 0.08;
    w += 0.8 * ((hits[t.id] ?? 0) / maxHits);
    if (weak.has(t.id)) w += 0.5;
    if (completed.has(t.id) && !weak.has(t.id)) w *= 0.35;
    return w;
  };

  const ordered = LEARNING_LEVELS.has(input.level)
    ? studyOrder(
        input.topics.map((t) => ({
          id: t.id,
          name: t.name,
          chapterId: "",
          requires: t.requires ?? [],
          weak: false,
        })),
      ).map((p) => input.topics.find((t) => t.id === p.id)!)
    : [...input.topics].sort((a, b) => weight(b) - weight(a));

  const minutes = shareMinutes(ordered.map(weight), totalMinutes);
  return ordered.map((t, i) => ({
    id: t.id,
    name: t.name,
    minutes: minutes[i],
    recap: completed.has(t.id) && !weak.has(t.id),
    skipped: false,
  }));
}

/** Whole minutes in proportion to the weights, each at least the minimum, summing to `total`. */
export function shareMinutes(weights: readonly number[], total: number): number[] {
  if (weights.length === 0) return [];
  const floor = Math.min(MIN_TOPIC_MINUTES, Math.floor(total / weights.length));
  const spare = total - floor * weights.length;
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const exact = weights.map((w) => (w / sum) * spare);
  const out = exact.map((x) => floor + Math.floor(x));
  // Hand out the leftover minutes to the largest remainders.
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) out[order[k].i]++;
  return out;
}

/**
 * The student moved a topic's time or skipped it: the other (unskipped) topics absorb the
 * difference in proportion, so the total stays the chosen option.
 */
export function adjustPlan(
  plan: readonly TopicPlan[],
  id: string,
  change: { minutes?: number; skipped?: boolean },
  total: number,
): TopicPlan[] {
  const next = plan.map((t) => (t.id === id ? { ...t, ...change } : { ...t }));
  const active = next.filter((t) => !t.skipped);
  if (active.length === 0) return plan.map((t) => ({ ...t }));
  const target = next.find((t) => t.id === id);
  // The changed topic keeps its new length (within limits); the others share the rest.
  const fixed = target && !target.skipped ? target : undefined;
  if (fixed) {
    const room = total - MIN_TOPIC_MINUTES * (active.length - 1);
    fixed.minutes = Math.max(MIN_TOPIC_MINUTES, Math.min(Math.round(fixed.minutes), room));
  }
  const others = active.filter((t) => t !== fixed);
  const remaining = total - (fixed?.minutes ?? 0);
  if (others.length > 0) {
    const shared = shareMinutes(
      others.map((t) => Math.max(t.minutes, 1)),
      remaining,
    );
    others.forEach((t, i) => (t.minutes = shared[i]));
  } else if (fixed) {
    fixed.minutes = total;
  }
  for (const t of next) if (t.skipped) t.minutes = 0;
  return next;
}

/** Where to break a long lesson into two parts: at the topic boundary closest to halfway. */
export function splitPoint(plan: readonly TopicPlan[]): number {
  const active = plan.filter((t) => !t.skipped);
  const total = active.reduce((a, t) => a + t.minutes, 0);
  let run = 0;
  let best = 1;
  let bestGap = Infinity;
  active.forEach((t, i) => {
    run += t.minutes;
    const gap = Math.abs(total / 2 - run);
    if (i < active.length - 1 && gap < bestGap) {
      bestGap = gap;
      best = i + 1;
    }
  });
  return best;
}
