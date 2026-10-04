/*
 * The backlog planner (SPEC §8, V2 · Step 13). Like packing a suitcase: the big essentials
 * go in first (topics others depend on, and weak ones), small things fill the gaps (revision
 * and flashcards), and whatever doesn't fit is listed instead of quietly left behind.
 */

export type PlanTopic = {
  id: string;
  name: string;
  chapterId: string;
  /** Prerequisites (topic ids), so a topic is never planned before what it builds on. */
  requires: string[];
  /** Weak topics (low quiz score, "didn't understand" highlights) are planned first. */
  weak: boolean;
};

export type PlanItem = {
  id: string;
  kind: "learn" | "revise" | "flashcards";
  topicId?: string;
  minutes: number;
  done: boolean;
};

export type PlanDay = { date: string; items: PlanItem[] };

export type PlanInput = {
  topics: PlanTopic[];
  /** First day of the plan, "YYYY-MM-DD" in the student's own time zone. */
  startDate: string;
  days: number;
  minutesPerDay: number;
  /** Length of each new lesson (the student's chosen duration). */
  lessonMinutes: number;
  /** Add a short flashcard review every day. */
  flashcards: boolean;
};

export const REVISE_MINUTES = 10;
export const FLASHCARD_MINUTES = 10;

/** "2026-10-05" + 2 days → "2026-10-07" (calendar dates, no time-zone surprises). */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

/** Topics in an order where every prerequisite comes first; weak topics as early as allowed. */
export function studyOrder(topics: PlanTopic[]): PlanTopic[] {
  const inPlan = new Map(topics.map((t) => [t.id, t]));
  const done = new Set<string>();
  const order: PlanTopic[] = [];
  const ready = () =>
    topics.filter((t) => !done.has(t.id) && t.requires.every((r) => !inPlan.has(r) || done.has(r)));
  while (order.length < topics.length) {
    const candidates = ready();
    if (candidates.length === 0) {
      // A cycle in the data (shouldn't happen; tested): take the rest as they are.
      order.push(...topics.filter((t) => !done.has(t.id)));
      break;
    }
    // Weak topics first, then the original (chapter) order.
    const next = candidates.find((t) => t.weak) ?? candidates[0];
    order.push(next);
    done.add(next.id);
  }
  return order;
}

/**
 * Builds the day-by-day plan. Each day: flashcards (if any), revision of topics learned 1 and
 * 3 days earlier, then as many new lessons as fit. Topics that don't fit are returned as
 * `overflow` so the student sees what's left.
 */
export function buildPlan(input: PlanInput): { days: PlanDay[]; overflow: PlanTopic[] } {
  const order = studyOrder(input.topics);
  const learnedOn = new Map<string, number>();
  const days: PlanDay[] = [];
  let next = 0;

  for (let d = 0; d < input.days; d++) {
    const items: PlanItem[] = [];
    let left = input.minutesPerDay;
    const add = (item: Omit<PlanItem, "id" | "done">) => {
      items.push({
        ...item,
        id: `${d}-${items.length}-${item.kind}-${item.topicId ?? ""}`,
        done: false,
      });
      left -= item.minutes;
    };
    // Keep room for one new lesson whenever the daily time allows one.
    const reserve = input.minutesPerDay >= input.lessonMinutes ? input.lessonMinutes : 0;
    const remaining = order.length - next;
    if (input.flashcards && left - FLASHCARD_MINUTES >= reserve) {
      add({ kind: "flashcards", minutes: FLASHCARD_MINUTES });
    }
    for (const [topicId, day] of learnedOn) {
      const due = d - day === 1 || d - day === 3;
      if (due && left - REVISE_MINUTES >= (remaining > 0 ? reserve : 0)) {
        add({ kind: "revise", topicId, minutes: REVISE_MINUTES });
      }
    }
    let learnedToday = 0;
    // New lessons while they fit; with less daily time than one lesson, still one a day.
    while (
      next < order.length &&
      (left >= input.lessonMinutes || (learnedToday === 0 && reserve === 0))
    ) {
      const topic = order[next++];
      add({ kind: "learn", topicId: topic.id, minutes: input.lessonMinutes });
      learnedOn.set(topic.id, d);
      learnedToday++;
    }
    days.push({ date: addDays(input.startDate, d), items });
  }
  return { days, overflow: order.slice(next) };
}

/** How far through the plan the student is. */
export function planProgress(
  days: readonly { items: readonly { done: boolean; minutes: number }[] }[],
): {
  done: number;
  total: number;
  minutesDone: number;
} {
  const items = days.flatMap((d) => d.items);
  const done = items.filter((i) => i.done);
  return {
    done: done.length,
    total: items.length,
    minutesDone: done.reduce((s, i) => s + i.minutes, 0),
  };
}
