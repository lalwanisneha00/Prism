import { statesUnit } from "@/lib/units";
import { z } from "zod";
import type { Level } from "@/data/levels";
import type { Chapter, Subject, Topic } from "@/lib/subjects";

/*
 * The chapter mock test (V2.5 · Step 5; the generator V3 builds on for multi-chapter tests).
 * Questions are written only from the chapter's own fact-checked revision points, styled on
 * the student's previous-year papers when they uploaded some. Numerical answers carry a
 * calculation that the server re-runs; a question whose answer doesn't check out is dropped.
 */

const text = z.string().trim().min(1);

export const MockQuestionSchema = z
  .object({
    type: z.enum(["mcq", "short", "long", "numerical"]),
    /** The topic id it tests. */
    topic: z.string().max(80),
    marks: z.int().min(1).max(20),
    /** Markdown with KaTeX maths. */
    question: text.max(1500),
    options: z.array(text.max(300)).min(2).max(6).optional(),
    answer: text.max(3000),
    /** The points an examiner looks for: the self-check list for written answers. */
    points: z.array(text.max(300)).max(10).default([]),
    /** For numerical questions: a calculation reproducing the answer (re-run by the server). */
    check: z
      .object({
        expression: z.string().trim().min(1).max(300),
        answer: z.number(),
        unit: z.string().trim().min(1).max(40).optional(),
      })
      .optional(),
  })
  .refine((q) => q.type !== "mcq" || (q.options && new Set(q.options).size >= 2), {
    message: "a multiple-choice question needs at least 2 different options",
    path: ["options"],
  })
  .refine((q) => q.type !== "mcq" || q.options?.includes(q.answer), {
    message: "the answer must be one of the options",
    path: ["answer"],
  })
  .refine((q) => q.type === "mcq" || q.points.length > 0, {
    message: "written questions need the expected points",
    path: ["points"],
  });

export const MockTestSchema = z.object({
  title: text.max(200),
  questions: z.array(MockQuestionSchema).min(3).max(30),
});

export type MockQuestion = z.infer<typeof MockQuestionSchema>;
export type MockTest = z.infer<typeof MockTestSchema>;

/** Test lengths offered, with roughly one mark per minute (as in most university papers). */
export const MOCK_LENGTHS = [15, 30, 45] as const;

/**
 * Keeps the questions that are safe to show: known topics, and numerical answers whose
 * calculation really gives the stated answer (within 1%). Returns what was dropped and why.
 */
export function checkQuestions(
  test: MockTest,
  topicIds: ReadonlySet<string>,
  evaluate: (expression: string) => number,
): { test: MockTest; dropped: string[] } {
  const dropped: string[] = [];
  const questions = test.questions.filter((q, i) => {
    if (!topicIds.has(q.topic)) {
      dropped.push(`question ${i + 1}: unknown topic "${q.topic}"`);
      return false;
    }
    if (q.type !== "numerical") return true;
    if (!q.check) {
      dropped.push(`question ${i + 1}: numerical answer without a calculation`);
      return false;
    }
    try {
      const value = evaluate(q.check.expression);
      const ok =
        Math.abs(value - q.check.answer) <= Math.max(1e-9, Math.abs(q.check.answer) * 0.01);
      if (!ok) {
        dropped.push(`question ${i + 1}: calculation gives ${value}, not ${q.check.answer}`);
        return false;
      }
      if (q.check.unit && !statesUnit(q.answer, q.check.unit)) {
        dropped.push(`question ${i + 1}: the answer doesn't give the unit ${q.check.unit}`);
        return false;
      }
      return true;
    } catch {
      dropped.push(`question ${i + 1}: calculation could not be run`);
      return false;
    }
  });
  return { test: { ...test, questions }, dropped };
}

export function mockPrompt(input: {
  subject: Subject;
  /** The chapter, or several chapters' names joined ("Electrostatics, Magnetism"). */
  chapter: Pick<Chapter, "name">;
  topics: readonly Topic[];
  level: Level;
  minutes: number;
  facts: readonly string[];
  pyqs: readonly string[];
}): { system: string; prompt: string } {
  const marks = input.minutes;
  const system = `You write a university-style mock test for an engineering student.
Rules:
- Ask ONLY about what the SOURCE FACTS below state. Never test anything they don't contain.
- About ${marks} marks in total for a ${input.minutes}-minute test: a mix of "mcq" (1 mark, exactly 4 options, the answer copied exactly from the options), "short" (2-3 marks), "long" (5-10 marks) and, when the facts contain formulas, "numerical" (3-5 marks).
- Every "numerical" question must include "check": {"expression": a plain calculation with numbers only (mathjs syntax, e.g. "8.99e9*2e-6/0.05^2"), "answer": the number it gives, "unit": its SI unit, e.g. "N/C" (omit for pure numbers)}. The answer text must state that number followed by that unit.
- For "short", "long" and "numerical", list in "points" the 2-6 points an examiner looks for (the student ticks them to mark themselves). Size model answers to the marks.
- Spread questions across all topics; use each question's topic id from the list.${input.pyqs.length ? "\n- Match the style, wording and marks of the PREVIOUS-YEAR QUESTIONS below (do not copy them)." : ""}
- Markdown and KaTeX ($...$) allowed; no HTML.
Level: ${input.level.name}: ${input.level.style}
Reply with JSON only: {"title":"...","questions":[{"type":"mcq","topic":"<id>","marks":1,"question":"...","options":["...","...","...","..."],"answer":"...","points":[]}]}`;
  const prompt = `Subject: ${input.subject.name}
Chapter: ${input.chapter.name}
Topics: ${input.topics.map((t) => `${t.name} (id: ${t.id})`).join("; ")}

SOURCE FACTS:
${input.facts.map((f) => `- ${f}`).join("\n")}
${input.pyqs.length ? `\nPREVIOUS-YEAR QUESTIONS:\n${input.pyqs.map((q) => `- ${q}`).join("\n")}` : ""}`;
  return { system, prompt };
}

/** A predictable test from the test AI, built from the facts given. */
export function fakeMockTest(topics: readonly Topic[], facts: readonly string[]): MockTest {
  const t = (i: number) => topics[i % topics.length].id;
  return {
    title: "Practice test (test AI)",
    questions: [
      {
        type: "mcq",
        topic: t(0),
        marks: 1,
        question: `Which statement is in your notes? (test question)`,
        options: [facts[0] ?? "Statement A", "Statement B", "Statement C", "Statement D"],
        answer: facts[0] ?? "Statement A",
        points: [],
      },
      {
        type: "short",
        topic: t(1),
        marks: 3,
        question: "Explain the main idea of this topic in your own words. (test question)",
        answer: facts[1] ?? "The main idea, in the student's words.",
        points: ["States the main idea", "Gives one example"],
      },
      {
        type: "numerical",
        topic: t(2),
        marks: 4,
        question: "Compute $2 \\times 3.5$. (test question)",
        answer: "7",
        points: ["Correct method", "Correct answer with units"],
        check: { expression: "2*3.5", answer: 7 },
      },
      {
        type: "long",
        topic: t(0),
        marks: 5,
        question: "Describe how the topics of this chapter connect. (test question)",
        answer: "A structured answer linking each topic to the next.",
        points: ["Introduction", "Each topic named", "Links explained", "Conclusion"],
      },
    ],
  };
}

/** Marks for a written answer from the points the student ticked. */
export function selfMarks(q: MockQuestion, ticked: number): number {
  if (q.points.length === 0) return 0;
  return Math.round((q.marks * Math.min(ticked, q.points.length)) / q.points.length);
}
