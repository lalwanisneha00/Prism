import { describe, expect, it } from "vitest";
import {
  canSeeAnswers,
  elapsedMs,
  formatClock,
  newClock,
  pauseClock,
  secondsLeft,
  startClock,
} from "@/lib/mock/clock";
import {
  checkSection,
  paperProblems,
  type CheckContext,
  type Paper,
  type PlannedSection,
} from "@/lib/mock/paper";
import { evaluateCheck } from "@/lib/safeMath";
import {
  commandOf,
  commandProblem,
  isRecall,
  itemsAsked,
  mcqProblem,
  numbersIn,
  outputProblem,
  parseSelfScore,
} from "@/lib/mock/verify";

const written = (question: string, answer: string, scheme: { point: string; marks: number }[]) => ({
  type: "short",
  question,
  answer,
  scheme,
});

describe("command words", () => {
  it("reads what each question asks for", () => {
    expect(commandOf("State the value of Euler's number $e$.")).toBe("value");
    expect(commandOf("Q3. Calculate the force between the charges.")).toBe("calculate");
    expect(commandOf("Define the imaginary unit $i$.")).toBe("define");
    expect(commandOf("Derive Gauss's law in differential form.")).toBe("derive");
    expect(commandOf("Compare series and parallel circuits.")).toBe("compare");
    expect(commandOf("State and explain Ohm's law.")).toBe("explain");
    expect(itemsAsked("List three properties of a dielectric.")).toBe(3);
  });

  it("treats define / state / the value of as recall, and explain / derive as not", () => {
    expect(isRecall("Define the imaginary unit $i$.")).toBe(true);
    expect(isRecall("State the value of $e$.")).toBe(true);
    expect(isRecall("Explain why $e^{i\\pi} = -1$.")).toBe(false);
    expect(isRecall("Derive the wave equation.")).toBe(false);
  });
});

describe("the answer key matches the question (Euler's e bug)", () => {
  it("catches 'state the value' answered with a definition", () => {
    const bug = written(
      "State the value of Euler's number $e$ in the context of Euler's identity.",
      "e is the base of natural logarithms.",
      [{ point: "e is the base of natural logarithms", marks: 2 }],
    );
    expect(commandProblem(bug)).toMatch(/asks for a value/);
  });

  it("catches a scheme that doesn't reward the value even when the answer has it", () => {
    const bug = written("State the value of $e$.", "$e \\approx 2.71828$", [
      { point: "Explains that e is the base of natural logarithms", marks: 2 },
    ]);
    expect(commandProblem(bug)).toMatch(/marking scheme/);
  });

  it("accepts a correct value answer and other well-matched keys", () => {
    expect(
      commandProblem(
        written("State the value of $e$.", "$e \\approx 2.71828$", [
          { point: "Value 2.718 (accept 2.72)", marks: 2 },
        ]),
      ),
    ).toBeNull();
    expect(
      commandProblem(
        written(
          "Define the imaginary unit $i$.",
          "The imaginary unit is the number whose square is $-1$: $i = \\sqrt{-1}$.",
          [
            { point: "i² = −1", marks: 1 },
            { point: "i = √−1", marks: 1 },
          ],
        ),
      ),
    ).toBeNull();
  });

  it("needs working for calculations, steps for derivations, N items for 'list N'", () => {
    expect(
      commandProblem(written("Calculate the current.", "2 A", [{ point: "Answer", marks: 2 }])),
    ).toMatch(/working/);
    expect(
      commandProblem(written("Derive Ohm's law.", "Steps…", [{ point: "All", marks: 5 }])),
    ).toMatch(/steps/);
    expect(
      commandProblem(
        written("List three units of charge.", "Coulomb", [{ point: "Coulomb", marks: 3 }]),
      ),
    ).toMatch(/3 items/);
  });

  it("checks an MCQ has one correct option and a reason that agrees", () => {
    const mcq = {
      type: "mcq",
      question: "Which is $i^2$?",
      options: ["$1$", "$-1$", "$0$", "$i$"],
      answer: "$-1$",
      reason: "By definition the square of i is minus one.",
      scheme: [],
    };
    expect(mcqProblem(mcq)).toBeNull();
    expect(mcqProblem({ ...mcq, answer: "$2$" })).toMatch(/exactly one/);
    expect(mcqProblem({ ...mcq, reason: "" })).toMatch(/reason/);
    expect(
      mcqProblem({ ...mcq, reason: "Option (a) is correct because squares are positive." }),
    ).toMatch(/different option/);
  });
});

describe("command words after a set-up sentence, and output questions", () => {
  it("reads the command that follows an 'Assume…' or 'Consider…' sentence", () => {
    expect(
      commandOf("Assume char is 1 byte and int is 4 bytes. Calculate sizeof(char) + sizeof(int)."),
    ).toBe("calculate");
    // So a bare result without working is sent back (the live Basics of C paper's Q6).
    expect(
      commandProblem(
        written("Assume int takes 4 bytes. Calculate the memory used by int a[10].", "40 bytes", [
          { point: "Size of one element", marks: 1 },
          { point: "Total 40 bytes", marks: 1 },
        ]),
      ),
    ).toMatch(/working/);
  });

  it("refuses an 'output' question whose code prints nothing", () => {
    expect(
      outputProblem(
        "What will be the output of the following expression in C: int x = 5, y = 10; int z = (x > y) && (y > 0);?",
      ),
    ).toMatch(/prints nothing/);
    expect(
      outputProblem(
        'Consider int a = 2; if (a > 3) printf("One"); else printf("Two"); What will be printed?',
      ),
    ).toBeNull();
    expect(outputProblem("Explain the output devices of a computer.")).toBeNull();
  });
});

describe("numbers in answers", () => {
  it("reads numbers written many ways", () => {
    expect(numbersIn("$1.6 \\times 10^{-19}$ C")[0]).toBeCloseTo(1.6e-19);
    expect(numbersIn("about 2.72")).toEqual([2.72]);
  });
});

describe("generation rejects a mismatched key and too much recall", () => {
  const section: PlannedSection = {
    id: "s1",
    name: "A",
    slots: [
      { id: "s1q1", type: "short", marks: 2, topic: "euler" },
      { id: "s1q2", type: "short", marks: 2, topic: "euler" },
    ],
  };
  const ctx: CheckContext = {
    scope: new Set(["euler"]),
    pyqs: [],
    pyqRepeatMarks: 0,
    evaluate: evaluateCheck,
  };
  const q = (slot: string, question: string, answer: string, point: string) => ({
    slot,
    type: "short",
    topic: "euler",
    marks: 2,
    question,
    answer,
    scheme: [{ point, marks: 2 }],
    source: "lesson",
    learningOutcome: `Outcome of ${slot}`,
    relevance: "A",
    difficulty: "medium",
  });

  it("sends the Euler's-e question back for rewriting", () => {
    const r = checkSection(
      section,
      [
        q(
          "s1q1",
          "State the value of Euler's number $e$.",
          "e is the base of natural logarithms.",
          "Base of natural logs",
        ),
        q(
          "s1q2",
          "Explain why $e^{i\\pi} + 1 = 0$ links five constants.",
          "It joins $e$, $i$, $\\pi$, 1 and 0 in one equation.",
          "Names the five constants and the link",
        ),
      ],
      ctx,
    );
    expect(r.ok.has("s1q2")).toBe(true);
    expect(r.problems).toEqual([{ slot: "s1q1", reason: expect.stringMatching(/value/) }]);
  });

  it("limits plain recall to the warm-up share", () => {
    const r = checkSection(
      section,
      [
        q(
          "s1q1",
          "Define the imaginary unit $i$.",
          "The number whose square is $-1$, $i = \\sqrt{-1}$.",
          "i² = −1",
        ),
        q(
          "s1q2",
          "Define Euler's number $e$ as a limit.",
          "The limit of $(1 + 1/n)^n$ as $n$ grows without bound.",
          "The limit form",
        ),
      ],
      { ...ctx, recallMarks: 2 },
    );
    expect(r.ok.size).toBe(1);
    expect(r.problems[0].reason).toMatch(/recall/);
  });

  it("cleans raw LaTeX in options before checking them", () => {
    const mcqSection: PlannedSection = {
      id: "s1",
      name: "A",
      slots: [{ id: "s1q1", type: "mcq", marks: 1, topic: "euler" }],
    };
    const r = checkSection(
      mcqSection,
      [
        {
          slot: "s1q1",
          type: "mcq",
          topic: "euler",
          marks: 1,
          question: "Which number squares to $-1$?",
          options: ["\\sqrt{-1}", "\\\\pi", "1", "e"],
          answer: "\\sqrt{-1}",
          reason: "Because $(\\sqrt{-1})^2 = -1$ by definition.",
          scheme: [],
          source: "lesson",
          learningOutcome: "Recognise the imaginary unit",
          relevance: "A",
          difficulty: "easy",
        },
      ],
      ctx,
    );
    const options = r.ok.get("s1q1")?.options ?? [];
    expect(options[0]).toBe("$\\sqrt{-1}$");
    expect(options[1]).toBe("$\\pi$");
    for (const o of options) expect(o.replace(/\$[^$]*\$/g, "")).not.toContain("\\");
  });
});

describe("marks add up", () => {
  it("the final check catches a scheme that doesn't add up to the question's marks", () => {
    const paper: Paper = {
      title: "T",
      subject: "s",
      totalMarks: 4,
      minutes: 10,
      sections: [
        {
          id: "s1",
          name: "A",
          questions: [
            {
              id: "q1",
              type: "short",
              topic: "t",
              marks: 4,
              question: "Explain it.",
              answer: "Because.",
              scheme: [{ point: "a", marks: 3 }],
              source: "lesson",
            },
          ],
        },
      ],
    };
    expect(paperProblems(paper, new Set(["t"]), 4).join()).toMatch(/scheme gives 3 of 4/);
  });
});

describe("paper mode: timer, answer sheet, self-marking", () => {
  it("the answer sheet is only shown after Finish", () => {
    expect(canSeeAnswers("paper")).toBe(false);
    expect(canSeeAnswers("finished")).toBe(true);
  });

  it("the timer counts down, pauses, and stops at 0 without going negative", () => {
    let c = startClock(newClock(), 0);
    expect(secondsLeft(c, 1, 20_000)).toBe(40);
    c = pauseClock(c, 20_000);
    expect(secondsLeft(c, 1, 999_999)).toBe(40);
    c = startClock(c, 1_000_000);
    expect(elapsedMs(c, 1_010_000)).toBe(30_000);
    expect(secondsLeft(c, 1, 2_000_000)).toBe(0);
    expect(formatClock(3725)).toBe("1:02:05");
  });

  it("checks the self-entered total: 0 to the total, half marks allowed", () => {
    expect(parseSelfScore("18.5", 30)).toEqual({ ok: true, score: 18.5 });
    expect(parseSelfScore("0", 30)).toEqual({ ok: true, score: 0 });
    expect(parseSelfScore("30", 30)).toEqual({ ok: true, score: 30 });
    expect(parseSelfScore("12,5", 30)).toEqual({ ok: true, score: 12.5 });
    expect(parseSelfScore("31", 30).ok).toBe(false);
    expect(parseSelfScore("-2", 30).ok).toBe(false);
    expect(parseSelfScore("abc", 30).ok).toBe(false);
    expect(parseSelfScore("", 30).ok).toBe(false);
    expect(parseSelfScore("1.234", 30).ok).toBe(false);
  });
});
