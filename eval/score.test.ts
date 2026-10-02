import { describe, expect, it } from "vitest";
import golden from "./golden.json";
import { GoldenSchema, normalizeForMatch, overallPercent, scoreLesson } from "./score";
import { sampleLessons } from "@/data/sampleLessons";
import { findChapter, findSubject, findTopic } from "@/lib/subjects";

const set = GoldenSchema.parse(golden);

describe("golden set", () => {
  it("has 15 topics with at least 3 facts each", () => {
    expect(set.topics).toHaveLength(15);
    for (const t of set.topics) expect(t.facts.length).toBeGreaterThanOrEqual(3);
  });

  it("only uses real topics in the right chapters", () => {
    const subject = findSubject(set.subject)!;
    for (const t of set.topics) {
      const chapter = findChapter(subject, t.chapter);
      expect(chapter && findTopic(chapter, t.topic), t.topic).toBeTruthy();
    }
  });

  it("has patterns that compile", () => {
    for (const t of set.topics)
      for (const f of t.facts) expect(() => new RegExp(f.pattern, "i")).not.toThrow();
  });
});

describe("scoring", () => {
  it("finds every Gauss's law fact in the hand-checked sample lesson", () => {
    const gauss = set.topics.find((t) => t.topic === "gauss-law")!;
    expect(scoreLesson(sampleLessons[0], gauss)).toEqual({
      topic: "gauss-law",
      found: ["statement", "closed-surface", "outside-zero"],
      missing: [],
    });
  });

  it("does not credit facts a lesson never states", () => {
    const transformers = set.topics.find((t) => t.topic === "transformers")!;
    expect(scoreLesson(sampleLessons[0], transformers).found).not.toContain("step");
  });

  it("reads LaTeX the way the patterns expect", () => {
    expect(normalizeForMatch(String.raw`\frac{Q_{\text{enc}}}{\varepsilon_0}`)).toBe(
      "fracq_textencvarepsilon_0",
    );
  });

  it("computes an overall percentage", () => {
    expect(
      overallPercent([
        { topic: "a", found: ["x", "y"], missing: ["z"] },
        { topic: "b", found: ["x"], missing: [] },
      ]),
    ).toBe(75);
    expect(overallPercent([])).toBe(0);
  });
});
