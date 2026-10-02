import { describe, expect, it } from "vitest";
import { levels } from "@/data/levels";
import { subjects } from "@/lib/subjects";

describe("subject data", () => {
  it("loads and validates every subject file", () => {
    expect(subjects.length).toBeGreaterThan(0);
  });

  it("has unique chapter ids and unique topic ids within each subject", () => {
    for (const subject of subjects) {
      const chapterIds = subject.chapters.map((c) => c.id);
      expect(new Set(chapterIds).size).toBe(chapterIds.length);
      const topicIds = subject.chapters.flatMap((c) => c.topics.map((t) => t.id));
      expect(new Set(topicIds).size).toBe(topicIds.length);
    }
  });

  it("includes Gauss's law (the V1 acceptance topic)", () => {
    const em = subjects.find((s) => s.id === "em");
    const topics = em?.chapters.flatMap((c) => c.topics.map((t) => t.id)) ?? [];
    expect(topics).toContain("gauss-law");
  });
});

describe("levels config", () => {
  it("defines all six levels, all switched on", () => {
    expect(levels.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(levels.filter((l) => l.available).map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
