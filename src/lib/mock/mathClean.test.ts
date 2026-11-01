import { describe, expect, it } from "vitest";
import {
  cleanAiText,
  displayProblems,
  readableMath,
  safeMathText,
  splitMath,
} from "@/lib/mock/mathClean";

describe("cleaning the AI's maths", () => {
  it("wraps bare LaTeX commands in $...$", () => {
    expect(cleanAiText("i = \\sqrt{-1}")).toBe("i = $\\sqrt{-1}$");
    expect(cleanAiText("The value of \\pi is about 3.14")).toBe(
      "The value of $\\pi$ is about 3.14",
    );
    expect(cleanAiText("Half is \\frac{a}{b}")).toBe("Half is $\\frac{a}{b}$");
  });

  it("fixes double-escaped backslashes from JSON", () => {
    expect(cleanAiText("$\\\\sqrt{-1}$")).toBe("$\\sqrt{-1}$");
    expect(cleanAiText("\\\\frac{1}{2}")).toBe("$\\frac{1}{2}$");
  });

  it("removes stray escape characters but keeps commands that start with n or t", () => {
    expect(cleanAiText('Line one\\nLine two \\"quoted\\"')).toBe('Line one\nLine two "quoted"');
    expect(cleanAiText("$\\nabla \\cdot E$ and $\\theta$")).toBe(
      "$\\nabla \\cdot E$ and $\\theta$",
    );
  });

  it("keeps good maths as it is, inline and display", () => {
    const text = "Use $E = mc^2$ and\n$$\\int_0^1 x\\,dx = \\frac{1}{2}$$";
    expect(cleanAiText(text)).toBe(text);
    expect(splitMath(text).filter((p) => p.math)).toHaveLength(2);
  });

  it("converts \\( \\) and \\[ \\] delimiters to dollars", () => {
    expect(cleanAiText("so \\(x^2\\) and \\[y\\]")).toBe("so $x^2$ and $$y$$");
  });
});

describe("no raw code on the page", () => {
  it("finds raw LaTeX and stray backslashes in plain text", () => {
    expect(displayProblems("(a) \\sqrt{-1}")).toHaveLength(1);
    expect(displayProblems("a stray \\ backslash")).toHaveLength(1);
    expect(displayProblems("(a) $\\sqrt{-1}$")).toEqual([]);
  });

  it("finds maths KaTeX can't render", () => {
    expect(displayProblems("$\\frac{1}{$")).toHaveLength(1);
    expect(displayProblems("$\\notacommand{x}$")).toHaveLength(1);
  });

  it("every typical MCQ option is clean after tidying", () => {
    const options = ["\\sqrt{-1}", "$\\\\pi$", "\\frac{a}{b}", "e^{i\\pi} + 1 = 0", "2.718\\n"];
    for (const o of options) expect(displayProblems(cleanAiText(o)), o).toEqual([]);
  });

  it("shows maths that can't render as readable text, never code", () => {
    expect(readableMath("\\frac{a}{b} + \\sqrt{x} \\times \\pi")).toBe("(a)/(b) + √(x) × π");
    const safe = safeMathText("Value: $\\badmacro{\\frac{1}{2}}$");
    expect(safe).not.toContain("\\");
    expect(safe).toContain("(1)/(2)");
  });
});
