import { PLANNER } from "@/lib/priority/config";
import type { Band } from "@/lib/priority/importance";
import type { PriorityTag } from "@/lib/priority/priority";
import { addDays } from "@/lib/planner/plan";

/*
 * The multi-day planner (SPEC §12.9 part 4). Like packing a week of school bags: the heavy
 * books (high priority) go in first but never before the ones they need (prerequisites), each
 * day gets only what fits in the time the student has that day, long days are split into
 * sessions with breaks, and anything that doesn't fit is listed with choices — never dropped
 * silently.
 */

export type ScheduleTopic = {
  /** "subject/topic". */
  key: string;
  subject: string;
  name: string;
  /** Prerequisites as keys; only those also in the plan matter. */
  requires: readonly string[];
  minutes: number;
  priority: number;
  tags: readonly PriorityTag[];
  band: Band;
};

export type ItemKind = "learn" | "revise" | "flashcards" | "final-revision" | "mock-test";

export type ScheduleItem = {
  id: string;
  kind: ItemKind;
  topicKey?: string;
  minutes: number;
  done: boolean;
  doneAt?: number;
};

export type Session = { itemIds: string[]; studyMinutes: number; breakAfter: number };

export type ScheduleDay = {
  date: string;
  /** Minutes the student set for this day (sitting time, breaks included). */
  available: number;
  items: ScheduleItem[];
  sessions: Session[];
  studyMinutes: number;
  breakMinutes: number;
};

export type Breaks = {
  sessionMinutes: number;
  shortBreak: number;
  longBreak: number;
  longBreakEvery: number;
};

export type ScheduleInput = {
  topics: readonly ScheduleTopic[];
  startDate: string;
  days: number;
  /** Minutes available per weekday, index 0 = Sunday … 6 = Saturday (0–480). */
  weekMinutes: readonly number[];
  /** One-off changes for dates ("YYYY-MM-DD" → minutes; 0 = no study that day). */
  overrides?: Readonly<Record<string, number>>;
  breaks?: Breaks;
  flashcards: boolean;
  /** Add a final revision and a mock test on the last day (long enough plans only). */
  finalReview: boolean;
};

export type ScheduleResult = {
  days: ScheduleDay[];
  /** Lowest-return topics that didn't fit (shown, with choices; never dropped silently). */
  overflow: ScheduleTopic[];
  /** When something didn't fit: what would make it fit. */
  fixes?: { extraDays: number; extraMinutesPerDay: number };
  /** Free study time left over, worth offering for revision or a mock test. */
  spareMinutes: number;
  overview: {
    bySubject: Record<string, number>;
    byBand: Record<Band, number>;
    studyMinutes: number;
    breakMinutes: number;
  };
};

export const DEFAULT_BREAKS: Breaks = {
  sessionMinutes: PLANNER.sessionMinutes,
  shortBreak: PLANNER.shortBreak,
  longBreak: PLANNER.longBreak,
  longBreakEvery: PLANNER.longBreakEvery,
};

export function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function availableOn(
  input: Pick<ScheduleInput, "weekMinutes" | "overrides">,
  date: string,
): number {
  const set = input.overrides?.[date] ?? input.weekMinutes[weekday(date)] ?? 0;
  return Math.max(0, Math.min(PLANNER.maxMinutesPerDay, set));
}

/** Break time needed for a day with this much study, given the session rules. */
export function breakMinutesFor(study: number, b: Breaks): number {
  const sessions = Math.ceil(study / b.sessionMinutes);
  let total = 0;
  for (let s = 1; s < sessions; s++)
    total += s % b.longBreakEvery === 0 ? b.longBreak : b.shortBreak;
  return total;
}

/** The most study that fits in a sitting of `available` minutes, after buffer and breaks. */
export function studyCapacity(available: number, b: Breaks): number {
  const usable = Math.floor(available * (1 - PLANNER.bufferShare));
  let study = usable;
  while (study > 0 && study + breakMinutesFor(study, b) > usable) study -= 5;
  return Math.max(0, study);
}

/** Prerequisites first; among ready topics, the highest priority, alternating subjects. */
export function priorityOrder(topics: readonly ScheduleTopic[]): ScheduleTopic[] {
  const inPlan = new Set(topics.map((t) => t.key));
  const placed = new Set<string>();
  const order: ScheduleTopic[] = [];
  let lastSubject = "";
  while (order.length < topics.length) {
    const ready = topics
      .filter((t) => !placed.has(t.key))
      .filter((t) => t.requires.every((r) => !inPlan.has(r) || placed.has(r)))
      .sort((a, b) => b.priority - a.priority);
    if (ready.length === 0) {
      order.push(...topics.filter((t) => !placed.has(t.key))); // a cycle in data: keep the rest
      break;
    }
    // Mix subjects: prefer another subject when its best topic is nearly as important.
    const best = ready[0];
    const other = ready.find((t) => t.subject !== lastSubject);
    const next =
      other && best.subject === lastSubject && best.priority - other.priority < 0.15 ? other : best;
    order.push(next);
    placed.add(next.key);
    lastSubject = next.subject;
  }
  return order;
}

/** Splits a day's items into sessions of about `sessionMinutes`, with breaks between them. */
export function groupSessions(items: readonly ScheduleItem[], b: Breaks): Session[] {
  const sessions: Session[] = [];
  let current: Session = { itemIds: [], studyMinutes: 0, breakAfter: 0 };
  for (const item of items) {
    if (current.itemIds.length > 0 && current.studyMinutes + item.minutes > b.sessionMinutes) {
      sessions.push(current);
      current = { itemIds: [], studyMinutes: 0, breakAfter: 0 };
    }
    current.itemIds.push(item.id);
    current.studyMinutes += item.minutes;
  }
  if (current.itemIds.length > 0) sessions.push(current);
  sessions.forEach((s, i) => {
    if (i < sessions.length - 1) {
      s.breakAfter = (i + 1) % b.longBreakEvery === 0 ? b.longBreak : b.shortBreak;
    }
  });
  return sessions;
}

/** Topics to leave out so the rest fits: lowest priority first, never a needed prerequisite. */
function chooseOverflow(order: readonly ScheduleTopic[], capacity: number): Set<string> {
  let needed = order.reduce((s, t) => s + t.minutes, 0);
  const out = new Set<string>();
  const byPriority = [...order].sort((a, b) => a.priority - b.priority);
  for (const t of byPriority) {
    if (needed <= capacity) break;
    const neededByKept = order.some(
      (o) => !out.has(o.key) && o.key !== t.key && o.requires.includes(t.key),
    );
    if (neededByKept) continue;
    out.add(t.key);
    needed -= t.minutes;
  }
  return out;
}

export function buildSchedule(input: ScheduleInput): ScheduleResult {
  const b = input.breaks ?? DEFAULT_BREAKS;
  const dates = Array.from({ length: input.days }, (_, i) => addDays(input.startDate, i));
  const capacity = dates.map((d) => studyCapacity(availableOn(input, d), b));

  // Reserve the last day's final revision and mock test, then daily flashcards and revisits.
  const finalDay =
    input.finalReview && input.days >= PLANNER.finalRevisionMinDays ? input.days - 1 : -1;
  const finalMinutes = PLANNER.finalRevisionMinutes + PLANNER.mockTestMinutes;
  const order = priorityOrder(input.topics);
  const revisits = order.filter((t) => t.tags.includes("weak") || t.tags.includes("tough")).length;
  const reserved =
    (finalDay >= 0 ? Math.min(finalMinutes, capacity[finalDay]) : 0) +
    (input.flashcards
      ? capacity.filter((c) => c >= PLANNER.flashcardMinutes * 2).length * PLANNER.flashcardMinutes
      : 0) +
    revisits * PLANNER.reviseMinutes;
  const learnCapacity = capacity.reduce((s, c) => s + c, 0) - reserved;
  const overflowKeys = chooseOverflow(order, Math.max(0, learnCapacity));
  const queue = order.filter((t) => !overflowKeys.has(t.key));

  const learnedOn = new Map<string, number>();
  const byKey = new Map(order.map((t) => [t.key, t]));
  const days: ScheduleDay[] = [];
  let next = 0;
  for (let d = 0; d < input.days; d++) {
    const items: ScheduleItem[] = [];
    let left = capacity[d];
    const add = (kind: ItemKind, minutes: number, topicKey?: string) => {
      items.push({
        id: `${dates[d]}:${items.length}:${kind}:${topicKey ?? ""}`,
        kind,
        topicKey,
        minutes,
        done: false,
      });
      left -= minutes;
    };
    if (d === finalDay) {
      if (left >= PLANNER.finalRevisionMinutes) add("final-revision", PLANNER.finalRevisionMinutes);
      if (left >= PLANNER.mockTestMinutes) add("mock-test", PLANNER.mockTestMinutes);
    }
    // A second look at weak and predicted-tough topics a few days after first study.
    for (const [key, day] of learnedOn) {
      if (d - day === PLANNER.revisitAfterDays && left >= PLANNER.reviseMinutes) {
        add("revise", PLANNER.reviseMinutes, key);
      }
    }
    if (
      input.flashcards &&
      capacity[d] >= PLANNER.flashcardMinutes * 2 &&
      left >= PLANNER.flashcardMinutes
    ) {
      add("flashcards", PLANNER.flashcardMinutes);
    }
    // New topics while they fit; a topic longer than any day still gets a day to itself.
    const learned: ScheduleTopic[] = [];
    while (next < queue.length && d !== finalDay) {
      const t = queue[next];
      const fits = t.minutes <= left;
      const onlyThing = learned.length === 0 && t.minutes > Math.max(...capacity) && left > 0;
      if (!fits && !onlyThing) break;
      learned.push(t);
      left -= t.minutes;
      next++;
    }
    // Harder (higher-priority) material earlier in the day, prerequisites still first.
    for (const t of placeHarderFirst(learned)) {
      items.push({
        id: `${dates[d]}:${items.length}:learn:${t.key}`,
        kind: "learn",
        topicKey: t.key,
        minutes: t.minutes,
        done: false,
      });
      if (t.tags.includes("weak") || t.tags.includes("tough")) learnedOn.set(t.key, d);
    }
    // Learn first, then revision and flashcards, then the final review.
    const rank: Record<ItemKind, number> = {
      learn: 0,
      revise: 1,
      flashcards: 2,
      "final-revision": 3,
      "mock-test": 4,
    };
    items.sort((x, y) => rank[x.kind] - rank[y.kind]);
    const sessions = groupSessions(items, b);
    const studyMinutes = items.reduce((s, i) => s + i.minutes, 0);
    days.push({
      date: dates[d],
      available: availableOn(input, dates[d]),
      items,
      sessions,
      studyMinutes,
      breakMinutes: sessions.reduce((s, x) => s + x.breakAfter, 0),
    });
  }

  // Anything still in the queue (rare: very uneven days) joins the overflow.
  const overflow = [...order.filter((t) => overflowKeys.has(t.key)), ...queue.slice(next)];
  const overflowMinutes = overflow.reduce((s, t) => s + t.minutes, 0);
  const avgCapacity = capacity.reduce((s, c) => s + c, 0) / Math.max(1, input.days);
  const spareMinutes = Math.max(
    0,
    days.reduce((s, day, i) => s + capacity[i] - day.studyMinutes, 0),
  );

  const bySubject: Record<string, number> = {};
  const byBand: Record<Band, number> = { high: 0, medium: 0, low: 0 };
  for (const day of days) {
    for (const item of day.items) {
      const t = item.topicKey ? byKey.get(item.topicKey) : undefined;
      if (!t) continue;
      bySubject[t.subject] = (bySubject[t.subject] ?? 0) + item.minutes;
      byBand[t.band] += item.minutes;
    }
  }

  return {
    days,
    overflow,
    fixes:
      overflow.length > 0
        ? {
            extraDays: Math.ceil(overflowMinutes / Math.max(avgCapacity, 1)),
            extraMinutesPerDay: Math.ceil(overflowMinutes / Math.max(input.days, 1)),
          }
        : undefined,
    spareMinutes: overflow.length > 0 ? 0 : spareMinutes,
    overview: {
      bySubject,
      byBand,
      studyMinutes: days.reduce((s, d) => s + d.studyMinutes, 0),
      breakMinutes: days.reduce((s, d) => s + d.breakMinutes, 0),
    },
  };
}

/** Highest priority first, but never before a prerequisite placed the same day. */
function placeHarderFirst(topics: readonly ScheduleTopic[]): ScheduleTopic[] {
  const out: ScheduleTopic[] = [];
  const keys = new Set(topics.map((t) => t.key));
  const pending = [...topics].sort((a, b) => b.priority - a.priority);
  while (pending.length) {
    const i = pending.findIndex((t) =>
      t.requires.every((r) => !keys.has(r) || out.some((o) => o.key === r)),
    );
    out.push(pending.splice(i === -1 ? 0 : i, 1)[0]);
  }
  return out;
}

/**
 * The plan from `fromDate` on, rebuilt with fresh priorities (a missed day, a new quiz). Done
 * items and earlier days stay as they were. The caller shows it and asks before saving.
 */
export function rebalance(
  days: readonly ScheduleDay[],
  fromDate: string,
  input: Omit<ScheduleInput, "startDate" | "days">,
): ScheduleResult {
  const kept = days.filter((d) => d.date < fromDate);
  const doneKeys = new Set(
    days.flatMap((d) => d.items.filter((i) => i.done && i.kind === "learn").map((i) => i.topicKey)),
  );
  const remainingDays = days.length - kept.length;
  const rest = buildSchedule({
    ...input,
    topics: input.topics.filter((t) => !doneKeys.has(t.key)),
    startDate: fromDate,
    days: Math.max(remainingDays, 1),
  });
  return { ...rest, days: [...kept, ...rest.days] };
}
