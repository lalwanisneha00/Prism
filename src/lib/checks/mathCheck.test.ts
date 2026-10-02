import { describe, expect, it } from "vitest";
import { findMathErrors, katexError, mathErrorsInMarkdown } from "@/lib/checks/mathCheck";
import { sampleLessons } from "@/data/sampleLessons";

describe("maths checks", () => {
  it("accepts valid LaTeX", () => {
    expect(katexError(String.raw`\frac{Q}{4\pi\varepsilon_0 r^2}`)).toBeNull();
  });

  it("reports broken LaTeX", () => {
    expect(katexError(String.raw`\frac{Q}{4\pi`)).not.toBeNull();
    expect(katexError(String.raw`\notacommand{x}`)).not.toBeNull();
  });

  it("finds broken formulas inside markdown, inline and display", () => {
    expect(
      mathErrorsInMarkdown(String.raw`Fine $E=mc^2$ and broken $\frac{1}{$ here`),
    ).toHaveLength(1);
    expect(
      mathErrorsInMarkdown(
        ["$$", String.raw`\oint E\cdot dA = \frac{Q}{\varepsilon_0`, "$$"].join("\n"),
      ),
    ).toHaveLength(1);
  });

  it("catches LaTeX commands written outside $…$", () => {
    expect(mathErrorsInMarkdown(String.raw`R = 0.0280 \Omega`)[0]).toMatch(/outside/);
    expect(mathErrorsInMarkdown(String.raw`R = $0.0280\ \Omega$`)).toEqual([]);
    expect(mathErrorsInMarkdown(String.raw`a\_b and \* are markdown escapes`)).toEqual([]);
  });

  it("passes the hand-written sample lesson", () => {
    expect(findMathErrors(sampleLessons[0])).toEqual([]);
  });

  it("points at the exact field that is broken", () => {
    const broken = structuredClone(sampleLessons[0]);
    broken.workedExamples[1].steps[2] = String.raw`$\Phi = \frac{Q}{6$`;
    // An unbalanced bracket is fine in LaTeX, so this one must NOT be reported.
    broken.revisionSheet.formulas[0] = String.raw`\Phi_E = EA\cos(`;
    const problems = findMathErrors(broken);
    expect(problems).toHaveLength(1);
    expect(problems[0].startsWith("workedExamples.1.steps.2:")).toBe(true);
  });
});
