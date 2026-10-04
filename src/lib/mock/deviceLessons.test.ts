import { describe, expect, it } from "vitest";
import { findSampleLesson } from "@/data/sampleLessons";
import { groupLessons } from "@/lib/mock/deviceLessons";
import type { Lesson } from "@/lib/schema";

const sample = findSampleLesson("gauss-law", "first-encounter")!;
const variant = (topic: string, chapter: string, createdAt: string, subject = "em"): Lesson => ({
  ...sample,
  meta: { ...sample.meta, subject, topic, chapter, createdAt },
});

describe("lessons on this device for a mock test", () => {
  it("keeps the newest lesson per topic, grouped by chapter, for one subject", () => {
    const grouped = groupLessons(
      [
        variant("gauss-law", "electrostatics", "2026-10-01T00:00:00.000Z"),
        variant("gauss-law", "electrostatics", "2026-10-03T00:00:00.000Z"),
        variant("electric-flux", "electrostatics", "2026-10-02T00:00:00.000Z"),
        variant("biot-savart-law", "magnetism", "2026-10-02T00:00:00.000Z"),
        variant(
          "taylor-maclaurin",
          "differential-calculus",
          "2026-10-02T00:00:00.000Z",
          "engg-math",
        ),
      ],
      "em",
    );
    expect([...grouped.keys()].sort()).toEqual(["electrostatics", "magnetism"]);
    const es = grouped.get("electrostatics")!;
    expect(es.map((t) => t.topicId).sort()).toEqual(["electric-flux", "gauss-law"]);
    expect(es.find((t) => t.topicId === "gauss-law")?.lesson.meta.createdAt).toBe(
      "2026-10-03T00:00:00.000Z",
    );
  });
});
