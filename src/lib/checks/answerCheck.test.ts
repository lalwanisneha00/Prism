import { describe, expect, it } from "vitest";
import {
  answerCheckProblems,
  closeEnough,
  evaluateCheck,
  dropFailedChecks,
  findAnswerProblems,
  numbersIn,
  statesValue,
  valuesIn,
} from "@/lib/checks/answerCheck";

describe("evaluateCheck", () => {
  it("computes ordinary, matrix and calculus answers", () => {
    expect(evaluateCheck("9e9 * 5e-9 / 0.2^2")).toBeCloseTo(1125, 6);
    expect(evaluateCheck("det([[2,1],[1,2]])")).toBeCloseTo(3, 9);
    expect(evaluateCheck('nintegrate("x^2", "x", 0, 3)')).toBeCloseTo(9, 6);
    expect(evaluateCheck('nderivative("x^3", "x", 2)')).toBeCloseTo(12, 4);
    expect(evaluateCheck("max(eigs([[2,1],[1,2]]).values)")).toBeCloseTo(3, 9);
  });

  it("refuses anything that isn't a plain calculation", () => {
    expect(() => evaluateCheck("import({x: 1})")).toThrow();
    expect(() => evaluateCheck('evaluate("1+1")')).toThrow(/not allowed/);
    expect(() => evaluateCheck("f(x) = x^2")).toThrow(/only a calculation/);
    expect(() => evaluateCheck('createUnit("foo")')).toThrow(/not allowed/);
    expect(() => evaluateCheck('nintegrate("constructor", "x", 0, 1)')).toThrow();
    expect(() => evaluateCheck("1/0")).toThrow(/finite/);
  });
});

describe("answer comparison", () => {
  it("reads numbers in the forms answers are written", () => {
    expect(numbersIn(String.raw`$E = 2.25 \times 10^{3}\ \text{N/C}$`)).toContain(2250);
    expect(numbersIn("about 1,125 N/C")).toContain(1125);
    expect(numbersIn("x = -0.5 or 4e-3")).toEqual([-0.5, 0.004]);
    expect(closeEnough(1124.9, 1125)).toBe(true);
    expect(closeEnough(1100, 1125)).toBe(false);
  });

  it("accepts a correct example and explains a wrong one", () => {
    expect(
      answerCheckProblems(
        { expression: "9e9 * 5e-9 / 0.2^2", answer: 1125 },
        String.raw`$E \approx 1.13 \times 10^{3}$ N/C`,
      ),
    ).toEqual([]);
    const wrong = answerCheckProblems({ expression: "2 + 2", answer: 5 }, "The answer is 5.");
    expect(wrong[0]).toMatch(/2 \+ 2 = 4, but check.answer is 5/);
    expect(answerCheckProblems({ expression: "2+2", answer: 4 }, "about four")).toEqual([
      "the written answer does not contain the checked value 4",
    ]);
  });
});

describe("lesson-level answer checks", () => {
  const good = { problem: "p", answer: "4", check: { expression: "2+2", answer: 4 } };
  const wrong = { problem: "p", answer: "5", check: { expression: "2+2", answer: 5 } };
  const broken = { problem: "p", answer: "7", check: { expression: "nope(", answer: 7 } };
  const plain: { problem: string; answer: string; check?: { expression: string; answer: number } } =
    { problem: "p", answer: "a proof" };

  it("lists problems with their example index", () => {
    expect(findAnswerProblems([good, wrong, plain])[0]).toMatch(/^workedExamples\.1: /);
  });

  it("removes wrong examples and un-badges unrunnable checks", () => {
    const kept = dropFailedChecks([good, wrong, broken, plain]);
    expect(kept.map((w) => w.answer)).toEqual(["4", "7", "a proof"]);
    expect(kept[1].check).toBeUndefined();
  });
});

describe("exact answers", () => {
  it("evaluates fractions, roots, logs and pi in written answers", () => {
    expect(valuesIn(String.raw`$\int_1^3 x^2\,dx = \frac{26}{3}$`)).toContainEqual(26 / 3);
    expect(valuesIn(String.raw`$2\ln 2$`).some((v) => closeEnough(v, 2 * Math.log(2)))).toBe(true);
    expect(valuesIn(String.raw`$\frac{\pi}{4}$`).some((v) => closeEnough(v, Math.PI / 4))).toBe(
      true,
    );
    expect(valuesIn(String.raw`$\sqrt{2}$ m`).some((v) => closeEnough(v, Math.SQRT2))).toBe(true);
    expect(
      answerCheckProblems(
        { expression: 'nintegrate("x^2", "x", 1, 3)', answer: 26 / 3 },
        String.raw`$\frac{26}{3}$`,
      ),
    ).toEqual([]);
  });
});

describe("the hand-written sample lesson", () => {
  it("has worked-example answers that pass the computer check", async () => {
    const { sampleLessons } = await import("@/data/sampleLessons");
    for (const lesson of sampleLessons) {
      expect(findAnswerProblems(lesson.workedExamples)).toEqual([]);
      expect(lesson.workedExamples.filter((w) => w.check).length).toBeGreaterThan(0);
    }
  });
});

describe("statesValue", () => {
  it("accepts SI-prefixed answers", () => {
    expect(statesValue("C = 88.5 pF", 8.854e-11)).toBe(true);
    expect(statesValue("F = 2.5 kN", 2500)).toBe(true);
    expect(statesValue("C = 88.5 pF", 9.5e-11)).toBe(false);
  });
});
