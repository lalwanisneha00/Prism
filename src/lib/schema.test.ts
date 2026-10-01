import { describe, expect, it } from "vitest";
import sample from "@/data/sample-lessons/gauss-law.first-encounter.json";
import { findSampleLesson } from "@/data/sampleLessons";
import { parseLesson } from "@/lib/schema";
import { findChapter, findSubject, findTopic } from "@/lib/subjects";

/** A deep copy of the sample that a test can break on purpose. */
function sampleCopy() {
  return structuredClone(sample) as typeof sample & Record<string, unknown>;
}

describe("sample lesson", () => {
  it("passes the lesson schema", () => {
    const result = parseLesson(sample);
    expect(result.ok ? [] : result.problems).toEqual([]);
  });

  it("points at a real subject, chapter and topic", () => {
    const subject = findSubject(sample.meta.subject);
    const chapter = subject && findChapter(subject, sample.meta.chapter);
    expect(chapter && findTopic(chapter, sample.meta.topic)).toBeDefined();
  });

  it("is findable by topic and level", () => {
    expect(findSampleLesson("gauss-law", "first-encounter")?.meta.title).toBe("Gauss's law");
  });

  it("has correct arithmetic in its worked examples", () => {
    const eps0 = 8.85e-12;
    expect(2.0e-6 / eps0).toBeCloseTo(2.26e5, -3);
    expect(2.0e-6 / eps0 / 6).toBeCloseTo(3.77e4, -2);
    expect(1.0e-9 / (4 * Math.PI * eps0 * 0.3 ** 2)).toBeCloseTo(99.9, 0);
    expect(200 * 0.5 * Math.cos(Math.PI / 3)).toBeCloseTo(50, 6);
  });
});

describe("lesson schema rejects broken lessons", () => {
  it("a quiz answer that is not one of the options", () => {
    const bad = sampleCopy();
    bad.quiz[0].answer = "Infinite";
    const result = parseLesson(bad);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.problems).toContain("quiz.0.answer: the answer must be one of the options");
  });

  it("a section with no sources", () => {
    const bad = sampleCopy();
    bad.sections[0].sourceIds = [];
    const result = parseLesson(bad);
    expect(!result.ok && result.problems.some((p) => p.startsWith("sections.0.sourceIds"))).toBe(
      true,
    );
  });

  it("a section citing a source that does not exist", () => {
    const bad = sampleCopy();
    bad.sections[1].sourceIds = ["made-up-source"];
    const result = parseLesson(bad);
    expect(!result.ok && result.problems).toContain(
      'sections.1.sourceIds: unknown source "made-up-source"',
    );
  });

  it("a visual type that is not on the approved list", () => {
    const bad = sampleCopy();
    (bad.sections[0] as Record<string, unknown>).visual = {
      type: "svg",
      code: "<svg/>",
      caption: "x",
    };
    expect(parseLesson(bad).ok).toBe(false);
  });

  it("an unknown level and a missing hook", () => {
    const bad = sampleCopy() as Record<string, unknown> & { meta: Record<string, unknown> };
    bad.meta.level = "genius";
    delete bad.hook;
    const result = parseLesson(bad);
    expect(!result.ok && result.problems.some((p) => p.startsWith("meta.level"))).toBe(true);
    expect(!result.ok && result.problems.some((p) => p.startsWith("hook"))).toBe(true);
  });

  it("audio that points at a missing section", () => {
    const bad = sampleCopy();
    bad.audioScript[1].sectionId = "nowhere";
    expect(parseLesson(bad).ok).toBe(false);
  });

  it("something that is not a lesson at all", () => {
    expect(parseLesson("hello").ok).toBe(false);
    expect(parseLesson(null).ok).toBe(false);
  });
});
