import { describe, expect, it } from "vitest";
import { splitPaper } from "@/lib/worksheet/splitPaper";
import { marksEarned } from "@/lib/worksheet/schema";

describe("splitPaper", () => {
  it("splits on common question numbering and keeps sub-parts together", () => {
    const paper = `Q1. State Gauss's law in integral form. (2 marks)
Q2) Using Gauss's law, find the field of an infinite line charge.
(a) Draw the Gaussian surface. (b) Derive E.
Question 3: A sphere of radius 10 cm carries 5 nC. Find E at 20 cm.`;
    expect(splitPaper(paper)).toEqual([
      "State Gauss's law in integral form. (2 marks)",
      "Using Gauss's law, find the field of an infinite line charge. (a) Draw the Gaussian surface. (b) Derive E.",
      "A sphere of radius 10 cm carries 5 nC. Find E at 20 cm.",
    ]);
  });

  it("handles plain 1. 2) numbering", () => {
    expect(splitPaper("1. Define electric flux here.\n2) State its SI unit please.")).toEqual([
      "Define electric flux here.",
      "State its SI unit please.",
    ]);
  });

  it("falls back to blank-line blocks when there is no numbering", () => {
    expect(splitPaper("Define flux in words.\n\nState Gauss law clearly.\n\nok")).toEqual([
      "Define flux in words.",
      "State Gauss law clearly.",
    ]);
  });

  it("does not split on numbers inside a question", () => {
    expect(splitPaper("1. A charge of 2. 5 nC sits at the origin of the axes.")).toHaveLength(1);
    expect(splitPaper("   ")).toEqual([]);
  });
});

describe("marksEarned", () => {
  it("gives full, half (rounded down) or no marks", () => {
    expect(marksEarned(5, "full")).toBe(5);
    expect(marksEarned(5, "part")).toBe(2);
    expect(marksEarned(5, "missed")).toBe(0);
  });
});
