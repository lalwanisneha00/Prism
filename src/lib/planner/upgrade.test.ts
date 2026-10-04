import { describe, expect, it } from "vitest";
import { upgradePlan } from "@/lib/planner/upgrade";
import type { StudyPlan } from "@/lib/storage/db";

const old: StudyPlan = {
  id: "plan:em",
  subject: "em",
  level: "building-blocks",
  lessonMinutes: 15,
  minutesPerDay: 60,
  startDate: "2026-10-05",
  days: [
    {
      date: "2026-10-05",
      items: [{ id: "a", kind: "learn", topicId: "gauss", minutes: 15, done: true }],
    },
  ],
  overflow: ["stokes"],
  createdAt: 1,
  updatedAt: 1,
  deleted: false,
};

describe("upgradePlan", () => {
  it("turns an old plan into a v2 plan without losing anything", () => {
    const up = upgradePlan(old);
    expect(up.version).toBe(2);
    expect(up.subjects).toEqual(["em"]);
    expect(up.weekMinutes).toEqual([60, 60, 60, 60, 60, 60, 60]);
    expect(up.days[0].items[0]).toMatchObject({ subject: "em", topicId: "gauss", done: true });
    expect(up.overflow).toEqual(["em/stokes"]);
  });
  it("leaves a v2 plan unchanged and is idempotent", () => {
    const up = upgradePlan(old);
    expect(upgradePlan(up)).toBe(up);
  });
});
