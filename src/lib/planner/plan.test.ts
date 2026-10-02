import { describe, expect, it } from "vitest";
import { addDays, buildPlan, planProgress, studyOrder, type PlanTopic } from "@/lib/planner/plan";
import { subjects } from "@/lib/subjects";

const t = (id: string, requires: string[] = [], weak = false): PlanTopic => ({
  id,
  name: id.toUpperCase(),
  chapterId: "ch",
  requires,
  weak,
});

describe("study order", () => {
  it("always puts prerequisites first, and weak topics as early as allowed", () => {
    const order = studyOrder([t("c", ["b"]), t("b", ["a"]), t("a"), t("d", [], true)]);
    expect(order.map((x) => x.id)).toEqual(["d", "a", "b", "c"]);
  });

  it("orders a whole real subject without breaking any prerequisite", () => {
    const em = subjects.find((s) => s.id === "em")!;
    const topics = em.chapters.flatMap((c) => c.topics.map((x) => t(x.id, x.requires ?? [])));
    const order = studyOrder(topics).map((x) => x.id);
    for (const topic of topics) {
      for (const r of topic.requires)
        expect(order.indexOf(r)).toBeLessThan(order.indexOf(topic.id));
    }
  });
});

describe("buildPlan", () => {
  const topics = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map((id) => t(id));

  it("fills each day, adds revision on day +1 and +3, and reports what doesn't fit", () => {
    const { days, overflow } = buildPlan({
      topics,
      startDate: "2026-10-30",
      days: 7,
      minutesPerDay: 45,
      lessonMinutes: 15,
      flashcards: true,
    });
    expect(days.map((d) => d.date)).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
    ]);
    // Day 1: flashcards (10) + two 15-min lessons = 40 of 45 minutes.
    expect(days[0].items.map((i) => `${i.kind}:${i.topicId ?? ""}`)).toEqual([
      "flashcards:",
      "learn:a",
      "learn:b",
    ]);
    // Day 2 revises what was learned on day 1.
    expect(days[1].items.filter((i) => i.kind === "revise").map((i) => i.topicId)).toEqual([
      "a",
      "b",
    ]);
    // Day 4 revises day 1 again (3 days later).
    expect(days[3].items.some((i) => i.kind === "revise" && i.topicId === "a")).toBe(true);
    for (const d of days) {
      expect(d.items.reduce((s, i) => s + i.minutes, 0)).toBeLessThanOrEqual(45);
    }
    const learned = days.flatMap((d) => d.items.filter((i) => i.kind === "learn"));
    expect(learned.length + overflow.length).toBe(topics.length);
  });

  it("still schedules one lesson a day when time is short, and tracks progress", () => {
    const { days, overflow } = buildPlan({
      topics: topics.slice(0, 3),
      startDate: "2026-10-03",
      days: 2,
      minutesPerDay: 10,
      lessonMinutes: 15,
      flashcards: false,
    });
    expect(days.map((d) => d.items.filter((i) => i.kind === "learn").length)).toEqual([1, 1]);
    expect(overflow.map((x) => x.id)).toEqual(["c"]);
    days[0].items[0].done = true;
    expect(planProgress(days)).toMatchObject({ done: 1, minutesDone: 15 });
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
