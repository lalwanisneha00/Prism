import { describe, expect, it } from "vitest";
import { findLevel } from "@/data/levels";
import {
  checkQuestions,
  fakeMockTest,
  mockPrompt,
  MockQuestionSchema,
  MockTestSchema,
  selfMarks,
} from "@/lib/mock/mockTest";
import { evaluateCheck } from "@/lib/safeMath";
import { findSubject } from "@/lib/subjects";

const em = findSubject("em")!;
const chapter = em.chapters.find((c) => c.id === "electrostatics")!;
const topics = chapter.topics.slice(0, 3);
const ids = new Set(topics.map((t) => t.id));

describe("chapter mock test", () => {
  it("the test AI's test is valid and passes the checks", () => {
    const test = MockTestSchema.parse(fakeMockTest(topics, ["Flux is E·A"]));
    const checked = checkQuestions(test, ids, evaluateCheck);
    expect(checked.dropped).toEqual([]);
    expect(checked.test.questions).toHaveLength(4);
  });

  it("drops numerical questions whose calculation is wrong, and unknown topics", () => {
    const test = MockTestSchema.parse(fakeMockTest(topics, []));
    test.questions[2].check = { expression: "2*3.5", answer: 8 };
    test.questions[1].topic = "somewhere-else";
    const checked = checkQuestions(test, ids, evaluateCheck);
    expect(checked.test.questions.map((q) => q.type)).toEqual(["mcq", "long"]);
    expect(checked.dropped).toHaveLength(2);
    expect(checked.dropped[1]).toContain("not 8");
  });

  it("rejects multiple choice without the answer among the options, and written answers without points", () => {
    const mcq = {
      type: "mcq",
      topic: "a",
      marks: 1,
      question: "Q",
      options: ["a", "b"],
      answer: "c",
    };
    expect(MockQuestionSchema.safeParse(mcq).success).toBe(false);
    const written = { type: "long", topic: "a", marks: 5, question: "Q", answer: "A" };
    expect(MockQuestionSchema.safeParse(written).success).toBe(false);
  });

  it("limits the AI to the facts and mentions previous-year style only when there are papers", () => {
    const base = {
      subject: em,
      chapter,
      topics,
      level: findLevel("exam-prep")!,
      minutes: 30,
      facts: ["Gauss's law relates flux to enclosed charge."],
    };
    const without = mockPrompt({ ...base, pyqs: [] });
    expect(without.system).toContain("Ask ONLY about what the SOURCE FACTS");
    expect(without.system).toContain("About 30 marks");
    expect(without.system).not.toContain("PREVIOUS-YEAR");
    const withPapers = mockPrompt({ ...base, pyqs: ["State Gauss's law. (2 marks)"] });
    expect(withPapers.prompt).toContain("PREVIOUS-YEAR QUESTIONS");
  });

  it("gives marks for the expected points the student ticked", () => {
    const q = MockQuestionSchema.parse({
      type: "long",
      topic: "a",
      marks: 10,
      question: "Q",
      answer: "A",
      points: ["1", "2", "3", "4"],
    });
    expect([0, 1, 2, 4, 9].map((n) => selfMarks(q, n))).toEqual([0, 3, 5, 10, 10]);
  });
});
