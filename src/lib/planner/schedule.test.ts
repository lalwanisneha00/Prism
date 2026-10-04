import { describe, expect, it } from "vitest";
import {
  availableOn,
  breakMinutesFor,
  buildSchedule,
  DEFAULT_BREAKS,
  groupSessions,
  priorityOrder,
  rebalance,
  studyCapacity,
  type ScheduleTopic,
} from "@/lib/planner/schedule";

const topic = (
  key: string,
  minutes: number,
  priority: number,
  extra: Partial<ScheduleTopic> = {},
): ScheduleTopic => ({
  key,
  subject: key.split("/")[0],
  name: key,
  requires: [],
  minutes,
  priority,
  tags: [],
  band: "medium",
  ...extra,
});

// 2026-10-05 is a Monday. College days Mon–Fri 2 h; weekends are days off with 8 h.
const WEEK = [480, 120, 120, 120, 120, 120, 480];

describe("multi-day planner", () => {
  it("lets the student set hours per weekday (up to 8 h) and change single dates", () => {
    const input = { weekMinutes: WEEK, overrides: { "2026-10-06": 0 } };
    expect(availableOn(input, "2026-10-05")).toBe(120);
    expect(availableOn(input, "2026-10-06")).toBe(0); // a holiday or busy day
    expect(availableOn(input, "2026-10-11")).toBe(480); // Sunday off: 8 hours
    expect(availableOn({ weekMinutes: [600, 0, 0, 0, 0, 0, 0] }, "2026-10-11")).toBe(480);
  });

  it("splits a long day into sessions with short and long breaks", () => {
    expect(breakMinutesFor(50, DEFAULT_BREAKS)).toBe(0);
    expect(breakMinutesFor(200, DEFAULT_BREAKS)).toBe(10 + 10 + 30);
    const cap = studyCapacity(480, DEFAULT_BREAKS);
    expect(cap + breakMinutesFor(cap, DEFAULT_BREAKS)).toBeLessThanOrEqual(480 * 0.9);
    expect(cap).toBeGreaterThan(300);
    const items = [30, 30, 30, 30].map((m, i) => ({
      id: `${i}`,
      kind: "learn" as const,
      minutes: m,
      done: false,
    }));
    const sessions = groupSessions(items, DEFAULT_BREAKS);
    expect(sessions.length).toBe(4);
    expect(sessions[0].breakAfter).toBe(10);
  });

  it("puts prerequisites first, high priority early, and mixes subjects", () => {
    const order = priorityOrder([
      topic("em/b", 20, 0.9, { requires: ["em/a"] }),
      topic("em/a", 20, 0.2),
      topic("math/x", 20, 0.85),
    ]);
    expect(order.map((t) => t.key).indexOf("em/a")).toBeLessThan(
      order.map((t) => t.key).indexOf("em/b"),
    );
    expect(order[0].key).toBe("math/x");
  });

  it("fits a 7-day plan, revisits weak topics and ends with revision and a mock test", () => {
    const topics = [
      topic("em/gauss", 30, 0.9, { tags: ["weak"], band: "high" }),
      topic("em/ohm", 10, 0.3, { band: "low" }),
      topic("math/div", 25, 0.7, { tags: ["tough"] }),
    ];
    const r = buildSchedule({
      topics,
      startDate: "2026-10-05",
      days: 7,
      weekMinutes: WEEK,
      flashcards: true,
      finalReview: true,
    });
    expect(r.overflow).toEqual([]);
    const all = r.days.flatMap((d) => d.items);
    expect(
      all
        .filter((i) => i.kind === "learn")
        .map((i) => i.topicKey)
        .sort(),
    ).toEqual(["em/gauss", "em/ohm", "math/div"]);
    expect(all.some((i) => i.kind === "revise" && i.topicKey === "em/gauss")).toBe(true);
    expect(r.days.at(-1)!.items.map((i) => i.kind)).toEqual(
      expect.arrayContaining(["final-revision", "mock-test"]),
    );
    expect(r.overview.byBand.high).toBeGreaterThan(r.overview.byBand.low);
    expect(r.spareMinutes).toBeGreaterThan(0);
    for (const d of r.days)
      expect(d.studyMinutes + d.breakMinutes).toBeLessThanOrEqual(d.available);
  });

  it("says plainly what doesn't fit (lowest return first, never a needed prerequisite) and how to fix it", () => {
    // Two 2-hour college days hold about 95 study minutes each: four 45-minute topics fit.
    const topics = [
      topic("em/a", 45, 0.1),
      topic("em/b", 45, 0.9, { requires: ["em/a"] }),
      topic("em/c", 45, 0.2),
      topic("em/d", 45, 0.8),
      topic("em/e", 45, 0.5),
    ];
    const r = buildSchedule({
      topics,
      startDate: "2026-10-05",
      days: 2,
      weekMinutes: [0, 120, 120, 120, 120, 120, 0],
      flashcards: false,
      finalReview: false,
    });
    expect(r.overflow.map((t) => t.key)).toEqual(["em/c"]);
    expect(r.fixes?.extraDays).toBeGreaterThan(0);
    expect(r.fixes?.extraMinutesPerDay).toBeGreaterThan(0);
  });

  it("rebalances only the days from today on, keeping finished work", () => {
    const topics = [topic("em/a", 30, 0.5), topic("em/b", 30, 0.4), topic("em/c", 30, 0.3)];
    const base = {
      weekMinutes: [60, 60, 60, 60, 60, 60, 60],
      flashcards: false,
      finalReview: false,
    };
    const first = buildSchedule({ ...base, topics, startDate: "2026-10-05", days: 4 });
    first.days[0].items.forEach((i) => (i.done = true));
    const r = rebalance(first.days, "2026-10-07", { ...base, topics });
    expect(r.days.length).toBe(4);
    expect(r.days[0]).toBe(first.days[0]);
    const later = r.days.slice(2).flatMap((d) => d.items.map((i) => i.topicKey));
    expect(later).not.toContain(first.days[0].items[0].topicKey);
  });
});
