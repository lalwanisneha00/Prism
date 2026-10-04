import { PRIORITY_WEIGHTS, REVISION_LEVELS } from "@/lib/priority/config";
import type { Band, Importance } from "@/lib/priority/importance";
import type { StudentState } from "@/lib/priority/length";

/*
 * A topic's priority (SPEC §12.9 part 4.1): its importance plus how much the student needs it,
 * weighted by level (revision levels lean on importance). The planner turns priority into
 * minutes inside the student's chosen range: the top topic gets the maximum, the bottom one
 * the minimum, the rest in between.
 */

export type PriorityTag = "high-return" | "weak" | "tough" | "done";

export type TopicPriority = {
  key: string;
  priority: number;
  tags: PriorityTag[];
  band: Band;
};

const NEED: Record<StudentState, number> = {
  weak: 1,
  tough: 0.75,
  new: 0.5,
  tried: 0.4,
  "done-well": 0.1,
};

export function topicPriority(
  key: string,
  importance: Importance,
  student: StudentState,
  level: string,
): TopicPriority {
  const w = REVISION_LEVELS.has(level) ? PRIORITY_WEIGHTS.revision : PRIORITY_WEIGHTS.learning;
  const priority = w.importance * importance.score + w.need * NEED[student];
  const tags: PriorityTag[] = [];
  if (importance.known && importance.band === "high") tags.push("high-return");
  if (student === "weak") tags.push("weak");
  if (student === "tough") tags.push("tough");
  if (student === "done-well") tags.push("done");
  return { key, priority, tags, band: importance.band };
}

/**
 * Minutes for each topic inside [min, max], by rank of priority (rounded to 5 minutes, never
 * outside the range). Equal priorities get equal time; a single topic gets the middle.
 */
export function minutesInRange(
  priorities: readonly TopicPriority[],
  min: number,
  max: number,
): Map<string, number> {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const values = priorities.map((p) => p.priority);
  const top = Math.max(...values);
  const bottom = Math.min(...values);
  const out = new Map<string, number>();
  for (const p of priorities) {
    const share = top === bottom ? 0.5 : (p.priority - bottom) / (top - bottom);
    const minutes = lo + share * (hi - lo);
    const rounded = Math.round(minutes / 5) * 5;
    out.set(p.key, Math.max(lo, Math.min(hi, rounded)));
  }
  return out;
}

export const TAG_LABEL: Record<PriorityTag, string> = {
  "high-return": "High return",
  weak: "Weak topic",
  tough: "May need extra time",
  done: "Already done",
};
