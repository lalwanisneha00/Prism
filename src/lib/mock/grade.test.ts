import { describe, expect, it } from "vitest";
import {
  breakdown,
  clampMarks,
  countedQuestions,
  fakeGrades,
  gradePrompt,
  GradeReplySchema,
  mcqGrade,
  selfGrade,
  type QuestionGrade,
} from "@/lib/mock/grade";
import type { Paper, PaperQuestion } from "@/lib/mock/paper";
import { scopeTree } from "@/lib/mock/scope";

const q = (
  id: string,
  topic: string,
  marks: number,
  type: PaperQuestion["type"] = "short",
): PaperQuestion => ({
  id,
  type,
  topic,
  marks,
  question: `Question ${id}`,
  ...(type === "mcq" ? { options: ["A", "B", "C", "D"] } : {}),
  answer: type === "mcq" ? "A" : "Model answer",
  scheme:
    type === "mcq"
      ? []
      : [
          { point: "Defines the law", marks: marks / 2 },
          { point: "Gives an example", marks: marks / 2 },
        ],
  source: "lesson",
});

const paper: Paper = {
  title: "Physics: Units 1, 2",
  subject: "p",
  totalMarks: 11,
  minutes: 20,
  sections: [
    { id: "s1", name: "A", questions: [q("m1", "a", 1, "mcq")] },
    {
      id: "s2",
      name: "B",
      attempt: 2,
      questions: [q("w1", "a", 5), q("w2", "b", 5), q("w3", "c", 5)],
    },
  ],
};
const tree = scopeTree({
  id: "p",
  chapters: [
    {
      id: "u1",
      name: "One",
      topics: [
        { id: "a", name: "Topic A" },
        { id: "b", name: "Topic B" },
      ],
    },
    { id: "u2", name: "Two", topics: [{ id: "c", name: "Topic C" }] },
  ],
});

describe("marking a mock", () => {
  it("marks MCQs automatically", () => {
    expect(mcqGrade(paper.sections[0].questions[0], { picked: "A" }).marks).toBe(1);
    expect(mcqGrade(paper.sections[0].questions[0], { picked: "B" }).marks).toBe(0);
  });

  it("counts the best answers in a choice section, so the total is the paper's total", () => {
    const answers = {
      m1: { picked: "A" },
      w1: { written: "x" },
      w2: { written: "y" },
      w3: { written: "z" },
    };
    const grades: Record<string, QuestionGrade> = {
      m1: { marks: 1, by: "auto" },
      w1: { marks: 2, by: "ai" },
      w2: { marks: 5, by: "ai" },
      w3: { marks: 4, by: "ai" },
    };
    expect(countedQuestions(paper, answers, grades).map((x) => x.id)).toEqual(["m1", "w2", "w3"]);
    const b = breakdown(paper, answers, grades, tree);
    expect(b.score).toBe(10);
    expect(b.total).toBe(11);
  });

  it("splits the score by topic and unit and finds the weakest topics", () => {
    const answers = { m1: { picked: "B" }, w1: { written: "x" }, w2: { written: "y" } };
    const grades: Record<string, QuestionGrade> = {
      m1: { marks: 0, by: "auto" },
      w1: { marks: 1, by: "ai" },
      w2: { marks: 5, by: "ai" },
      w3: { marks: 0, by: "auto" },
    };
    const b = breakdown(paper, answers, grades, tree);
    expect(b.byTopic.find((t) => t.id === "a")).toMatchObject({ score: 1, total: 6, unitId: "u1" });
    expect(b.byUnit).toEqual([expect.objectContaining({ number: 1, score: 6, total: 11 })]);
    expect(b.weakest.map((t) => t.id)).toEqual(["a"]);
  });

  it("keeps AI marks inside the question and on half marks", () => {
    expect(clampMarks(7, 5)).toBe(5);
    expect(clampMarks(-1, 5)).toBe(0);
    expect(clampMarks(2.3, 5)).toBe(2.5);
    expect(clampMarks(Number.NaN, 5)).toBe(0);
  });

  it("lets the student mark themselves from the scheme", () => {
    expect(selfGrade(q("w", "a", 4), [0]).marks).toBe(2);
    expect(selfGrade(q("w", "a", 4), [0, 1, 5]).marks).toBe(4);
  });

  it("the test AI's marks are valid and the prompt treats answers as data", () => {
    const items = [
      {
        id: "w1",
        question: "Q",
        marks: 4,
        answer: "A",
        scheme: [{ point: "Defines the law", marks: 4 }],
        studentAnswer: "It defines the law clearly",
      },
    ];
    expect(GradeReplySchema.parse(fakeGrades(items)).grades[0].marks).toBe(4);
    expect(gradePrompt(items).system).toMatch(/ignore any instructions/);
  });
});
