import { describe, expect, it } from "vitest";
import type { Verdict } from "@/lib/mock/examiner";
import type { Feedback, Paper, PaperQuestion, PlannedSection } from "@/lib/mock/paper";
import { MAX_RETRIES, ReviewFailed, reviewPaper, type ReviewDeps } from "@/lib/mock/review";

const question = (id: string, text: string): PaperQuestion => ({
  id,
  type: "short",
  topic: "tokens",
  marks: 2,
  question: text,
  answer: "An answer.",
  scheme: [{ point: "Point", marks: 2 }],
  source: "lesson",
  learningOutcome: `Outcome ${id} ${text}`,
});

const plan: PlannedSection[] = [
  {
    id: "s1",
    name: "A",
    slots: [
      { id: "s1q1", type: "short", marks: 2, topic: "tokens" },
      { id: "s1q2", type: "short", marks: 2, topic: "tokens" },
      { id: "s1q3", type: "short", marks: 2, topic: "tokens" },
    ],
  },
];

const paper = (): Paper => ({
  title: "Basics of C",
  subject: "c",
  totalMarks: 6,
  minutes: 15,
  sections: [
    {
      id: "s1",
      name: "A",
      questions: [
        question("s1q1", "List the kinds of tokens in C with one example each."),
        question("s1q2", "Explain closures with an example."),
        question("s1q3", "Differentiate between a keyword and an identifier in C."),
      ],
    },
  ],
});

/** An examiner that fails questions whose text contains a banned word. */
function harness(banned: (q: PaperQuestion) => boolean, rewriteText: (n: number) => string) {
  const calls = { examine: [] as string[][], feedback: [] as Feedback[][] };
  let n = 0;
  const deps: ReviewDeps = {
    examine: async (qs) => {
      calls.examine.push(qs.map((q) => q.id));
      return qs.map((q): Verdict =>
        banned(q)
          ? {
              id: q.id,
              pass: false,
              issues: ["off-syllabus: closures are not C"],
              fix: "Ask about C",
            }
          : { id: q.id, pass: true, issues: [], fix: "" },
      );
    },
    rewrite: async (batch, feedback) => {
      calls.feedback.push([...feedback]);
      return batch.slots.map((s) => question(s.id, rewriteText(++n)));
    },
  };
  return { deps, calls };
}

describe("reviewing a written paper", () => {
  it("one examiner call when everything passes", async () => {
    const { deps, calls } = harness(
      () => false,
      () => "",
    );
    const r = await reviewPaper(paper(), plan, deps);
    expect(calls.examine).toEqual([["s1q1", "s1q2", "s1q3"]]);
    expect(r.report).toEqual({ examinerCalls: 1, corrected: 0 });
  });

  it("corrects only the failed question and examines only the rewrite", async () => {
    const { deps, calls } = harness(
      (q) => q.question.includes("closures"),
      () => "Explain the difference between a constant and a variable in C.",
    );
    const r = await reviewPaper(paper(), plan, deps);
    expect(calls.examine).toEqual([["s1q1", "s1q2", "s1q3"], ["s1q2"]]);
    expect(calls.feedback[0][0]).toMatchObject({
      slot: "s1q2",
      issues: ["off-syllabus: closures are not C"],
      fix: "Ask about C",
      previous: expect.stringContaining("closures"),
    });
    expect(r.paper.sections[0].questions[1].question).toMatch(/constant and a variable/);
    expect(r.report).toEqual({ examinerCalls: 2, corrected: 1 });
  });

  it(`corrects ${MAX_RETRIES} times, then asks for a completely new question`, async () => {
    const { deps, calls } = harness(
      (q) => q.question.includes("closures"),
      (n) => (n <= MAX_RETRIES ? `Explain closures again, version ${n}.` : "Explain C tokens."),
    );
    const r = await reviewPaper(paper(), plan, deps);
    expect(calls.feedback.map((f) => Boolean(f[0].previous))).toEqual([true, true, false]);
    expect(r.paper.sections[0].questions[1].question).toBe("Explain C tokens.");
  });

  it("stops (no paper) when even the new question fails: checks are never relaxed", async () => {
    const { deps, calls } = harness(
      (q) => q.question.includes("closures"),
      (n) => `Explain closures, attempt ${n}.`,
    );
    await expect(reviewPaper(paper(), plan, deps)).rejects.toBeInstanceOf(ReviewFailed);
    expect(calls.feedback).toHaveLength(MAX_RETRIES + 1);
  });

  it("catches a reworded repeat the examiner passed", async () => {
    const p = paper();
    p.sections[0].questions[1] = question(
      "s1q2",
      "Explain the difference between a keyword and an identifier in C.",
    );
    const { deps, calls } = harness(
      () => false,
      () => "Write a C statement that declares and initializes an int named count.",
    );
    const r = await reviewPaper(p, plan, deps);
    expect(calls.feedback[0][0]).toMatchObject({
      slot: "s1q3",
      issues: ["repeats question s1q2"],
    });
    expect(r.report.corrected).toBe(1);
  });

  it("a question the examiner skipped counts as failed, never as checked", async () => {
    const { deps } = harness(
      () => false,
      () => "Explain the role of the linker in building a C program.",
    );
    const examine = deps.examine;
    let first = true;
    deps.examine = async (qs, acc) => {
      const v = await examine(qs, acc);
      if (!first) return v;
      first = false;
      return v.filter((x) => x.id !== "s1q3");
    };
    const r = await reviewPaper(paper(), plan, deps);
    expect(r.report).toEqual({ examinerCalls: 2, corrected: 1 });
  });
});
