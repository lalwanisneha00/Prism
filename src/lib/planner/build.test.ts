import { describe, expect, it } from "vitest";
import { buildV2Plan } from "@/lib/planner/build";
import { EMPTY_MODEL, topicKey } from "@/lib/priority/model";
import { allSubjects as subjects } from "@/lib/subjects";

const em = subjects.find((s) => s.id === "em")!;
const all = new Set(em.chapters.flatMap((c) => c.topics.map((t) => topicKey(em.id, t.id))));

describe("buildV2Plan", () => {
  it("makes a 7-day plan with every topic time inside the 5–30 min range", () => {
    const plan = buildV2Plan({
      subjects: [em],
      picked: all,
      model: EMPTY_MODEL,
      level: "building-blocks",
      range: { min: 5, max: 30 },
      weekMinutes: [480, 120, 120, 120, 120, 120, 480],
      startDate: "2026-10-05",
      days: 7,
      flashcards: false,
      finalReview: false,
      now: 1,
    });
    expect(plan.version).toBe(2);
    expect(plan.days).toHaveLength(7);
    const learn = plan.days.flatMap((d) => d.items).filter((i) => i.kind === "learn");
    expect(learn.length).toBeGreaterThan(0);
    for (const i of learn) {
      expect(i.minutes).toBeGreaterThanOrEqual(5);
      expect(i.minutes).toBeLessThanOrEqual(30);
      expect(i.subject).toBe("em");
    }
    // Everything is either planned or listed as overflow.
    expect(learn.length + plan.overflow.length).toBe(all.size);
  });

  it("gives a day off (0 minutes) no items", () => {
    const plan = buildV2Plan({
      subjects: [em],
      picked: all,
      model: EMPTY_MODEL,
      level: "building-blocks",
      range: { min: 10, max: 30 },
      weekMinutes: [60, 60, 60, 60, 60, 60, 60],
      overrides: { "2026-10-06": 0 },
      startDate: "2026-10-05",
      days: 3,
      flashcards: false,
      finalReview: false,
    });
    expect(plan.days[1].items).toHaveLength(0);
  });
});
