import { describe, expect, it } from "vitest";
import { findSampleLesson } from "@/data/sampleLessons";
import {
  breakPoints,
  mergeRevision,
  minutesLeft,
  mixedQuiz,
  scoresByTopic,
  type TopicLesson,
} from "@/lib/chapter/extras";
import type { Lesson } from "@/lib/schema";

const sample = findSampleLesson("gauss-law", "first-encounter")!;
const variant = (id: string, extra: Partial<Lesson["revisionSheet"]> = {}): TopicLesson => ({
  topicId: id,
  name: id.toUpperCase(),
  minutes: 10,
  lesson: {
    ...sample,
    quiz: sample.quiz.map((q) => ({ ...q, question: `${id}: ${q.question}` })),
    revisionSheet: { ...sample.revisionSheet, ...extra },
  },
});

describe("chapter extras", () => {
  it("merges revision sheets without repeating the same point", () => {
    const a = variant("a");
    const b = variant("b", { keyPoints: [...sample.revisionSheet.keyPoints, "A brand new point"] });
    const merged = mergeRevision([a, b]);
    expect(merged.keyPoints).toHaveLength(sample.revisionSheet.keyPoints.length + 1);
    expect(merged.formulas).toHaveLength(new Set(sample.revisionSheet.formulas).size);
  });

  it("interleaves quiz questions across topics and scores each topic", () => {
    const quiz = mixedQuiz([variant("a"), variant("b"), variant("c")], 2);
    expect(quiz.map((q) => q.topicId)).toEqual(["a", "b", "c", "a", "b", "c"]);
    const scores = scoresByTopic(quiz, [true, false, true, true, false, false]);
    expect(scores).toEqual([
      { topicId: "a", score: 2, total: 2 },
      { topicId: "b", score: 0, total: 2 },
      { topicId: "c", score: 1, total: 2 },
    ]);
  });

  it("places breaks about every 25 minutes, never after the last topic", () => {
    expect(breakPoints([10, 10, 10, 10, 10, 10, 10].map((minutes) => ({ minutes })))).toEqual([
      2, 5,
    ]);
    expect(breakPoints([{ minutes: 40 }])).toEqual([]);
  });

  it("counts the minutes left", () => {
    const topics = [
      { id: "a", minutes: 10 },
      { id: "b", minutes: 15 },
    ];
    expect(minutesLeft(topics, new Set(["a"]))).toBe(15);
  });
});
