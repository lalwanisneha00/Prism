import { describe, expect, it } from "vitest";
import { checklistFor, checklistText, CHECKLISTS } from "@/lib/mock/checklist";
import {
  EXAM_CHECKS,
  fakeReview,
  ReviewReplySchema,
  reviewPrompt,
  verdictFor,
  type ExamItem,
} from "@/lib/mock/examiner";
import { evaluateCheck } from "@/lib/safeMath";
import { activeChapters } from "@/lib/syllabusFix/active";
import { findSubject } from "@/lib/subjects";

const numerical: ExamItem = {
  id: "s1q1",
  type: "numerical",
  topic: "arrays",
  marks: 2,
  question: "An array has 10 elements; assume int is 4 bytes. How many bytes does int a[10] use?",
  answer: "10 × 4 = 40 bytes",
  scheme: [
    { point: "Method", marks: 1 },
    { point: "40 bytes", marks: 1 },
  ],
  check: { expression: "10*4", answer: 40 },
};
const mcq: ExamItem = {
  id: "s1q2",
  type: "mcq",
  topic: "tokens",
  marks: 1,
  question: "Which of these is a valid C identifier?",
  options: ["2count", "count_2", "int", "count-2"],
  answer: "count_2",
  reason: "Identifiers may hold letters, digits and _, not start with a digit.",
  scheme: [],
};
const allFine = Object.fromEntries(Object.keys(EXAM_CHECKS).map((k) => [k, true]));
/** An examiner result; every check is fine unless the test says otherwise. */
const result = (r: { checks?: Record<string, boolean> } & Record<string, unknown>) =>
  ReviewReplySchema.parse({ results: [{ ...r, checks: { ...allFine, ...r.checks } }] }).results[0];

describe("the paper's examiner verdict", () => {
  it("passes a clean result and re-runs the examiner's own calculation", () => {
    expect(
      verdictFor(numerical, result({ id: "s1q1", pass: true, expression: "10*4" }), evaluateCheck),
    ).toMatchObject({ pass: true });
    const wrongKey = { ...numerical, check: { expression: "10*4", answer: 20 } };
    const v = verdictFor(
      wrongKey,
      result({ id: "s1q1", pass: true, expression: "10*4" }),
      evaluateCheck,
    );
    expect(v.pass).toBe(false);
    expect(v.issues.join()).toMatch(/40, not 20/);
  });

  it("fails an MCQ when the examiner, solving without the key, picks another option", () => {
    expect(
      verdictFor(mcq, result({ id: "s1q2", pass: true, option: "(B)" }), evaluateCheck).pass,
    ).toBe(true);
    const v = verdictFor(mcq, result({ id: "s1q2", pass: true, option: "c" }), evaluateCheck);
    expect(v.pass).toBe(false);
    expect(v.issues.join()).toMatch(/picked \(c\), not \(b\)/);
  });

  it("keeps the examiner's issues and fix, and never calls an unchecked question checked", () => {
    const v = verdictFor(
      numerical,
      result({
        id: "s1q1",
        pass: false,
        issues: ["assumes sizeof(int) is 4 without saying so"],
        fix: "State the assumption",
        expression: "10*4",
      }),
      evaluateCheck,
    );
    expect(v).toEqual({
      id: "s1q1",
      pass: false,
      issues: ["assumes sizeof(int) is 4 without saying so"],
      fix: "State the assumption",
    });
    expect(verdictFor(numerical, undefined, evaluateCheck)).toMatchObject({
      pass: false,
      issues: [expect.stringMatching(/didn't check/)],
    });
  });

  it("passes only when every check is true, naming the failed check when no issue is given", () => {
    const v = verdictFor(
      numerical,
      result({ id: "s1q1", checks: { unambiguous: false }, expression: "10*4" }),
      evaluateCheck,
    );
    expect(v.pass).toBe(false);
    expect(v.issues).toEqual([`fails the check: ${EXAM_CHECKS.unambiguous}`]);
    // A check left out counts as failed, not as fine.
    const partial = ReviewReplySchema.parse({
      results: [{ id: "s1q1", checks: { syllabus: true }, expression: "10*4" }],
    }).results[0];
    expect(verdictFor(numerical, partial, evaluateCheck).pass).toBe(false);
  });

  it("the test AI's examiner passes a correct key", () => {
    const reply = ReviewReplySchema.parse(fakeReview([numerical, mcq]));
    expect(
      reply.results.map((r, i) => verdictFor([numerical, mcq][i], r, evaluateCheck).pass),
    ).toEqual([true, true]);
  });
});

describe("subject checklists", () => {
  const namesOf = (id: string) => {
    const s = findSubject(id)!;
    return {
      name: s.name,
      topicNames: activeChapters(s).flatMap((c) => [c.name, ...c.topics.map((t) => t.name)]),
    };
  };

  it("are valid data files", () => {
    expect(CHECKLISTS.length).toBeGreaterThan(0);
  });

  it("the C checklist goes to C courses only (not the Python Computer Programming - II)", () => {
    expect(checklistFor(namesOf("pdeu-computer-programming-i-ict"))?.id).toBe("c-programming");
    expect(checklistFor(namesOf("pdeu-introduction-to-computer-programming-1"))?.id).toBe(
      "c-programming",
    );
    expect(checklistFor(namesOf("pdeu-computer-programming-ii-me"))).toBeUndefined();
    expect(checklistFor(namesOf("pdeu-discrete-mathematics"))).toBeUndefined();
  });

  it("covers the eight C areas and reaches the examiner's prompt", () => {
    const c = CHECKLISTS.find((x) => x.id === "c-programming")!;
    const text = checklistText(c);
    for (const area of [
      "Data types",
      "Operators",
      "Tokens",
      "Arrays",
      "Pointers",
      "Functions",
      "Program structure",
      "Compilation stages",
    ])
      expect(text).toContain(area);
    const { system, prompt } = reviewPrompt({
      course: "Computer Programming - I",
      topics: ["C Tokens (Basics of Programming)"],
      outside: ["Pointer (Derived Data types)"],
      checklist: text,
      questions: [numerical, mcq],
      accepted: ["Explain the structure of a C program."],
    });
    expect(system).toMatch(/FIND ERRORS/);
    expect(system).toContain("sizeof(char) == 1");
    expect(prompt).toContain("ID s1q1 (numerical, 2 marks");
    expect(prompt).toContain("(b) count_2");
    expect(prompt).toContain("NOT IN THIS PAPER");
    expect(prompt).toContain("ALREADY ACCEPTED");
  });
});
