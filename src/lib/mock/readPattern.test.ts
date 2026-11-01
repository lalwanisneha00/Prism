import { describe, expect, it } from "vitest";
import { patternMarks } from "@/lib/mock/pattern";
import {
  chunkPaper,
  guessType,
  marksIn,
  patternFromExtractions,
  rulePattern,
} from "@/lib/mock/readPattern";

const PAPER = `PANDIT DEENDAYAL ENERGY UNIVERSITY
End Semester Examination
Time: 3 Hours   Max. Marks: 100
Section A (Answer all)
1. Define electric flux. (2)
2. State Coulomb's law. (2)
3. What is a dielectric? (2)
4. Define capacitance. (2)
5. State Ohm's law. (2)
Section B Attempt any four
1. Derive the expression for the electric field due to an infinite line charge. (10)
2. Calculate the force between two charges of 2 C and 3 C placed 1 m apart in air. (10)
3. Draw a neat labelled diagram of a parallel-plate capacitor and explain it. (10)
4. Explain the boundary conditions at a dielectric interface. (10)
5. Explain the polarisation of dielectrics in detail. (10)
Section C
1. Explain Maxwell's equations in integral and differential form. (25)
2. Determine the energy stored in a capacitor of 4 F charged to 10 V. (25)`;

describe("reading a paper's pattern without AI", () => {
  it("finds sections, choice, marks, time and types", () => {
    const p = rulePattern(PAPER, 1)!;
    expect(p.sections.map((s) => s.name)).toEqual(["Section A", "Section B", "Section C"]);
    expect(p.sections[0].questions).toHaveLength(5);
    expect(p.sections[1].attempt).toBe(4);
    expect(p.minutes).toBe(180);
    expect(p.totalMarks).toBe(10 + 40 + 50);
    expect(p.sections[1].questions.map((q) => q.type)).toEqual([
      "derivation",
      "numerical",
      "diagram",
      "long",
      "long",
    ]);
    expect(p.source).toBe("rules");
    expect(p.samples.length).toBeGreaterThan(5);
  });

  it("reads marks written in different ways", () => {
    expect(marksIn("Explain X. (5)")).toBe(5);
    expect(marksIn("Explain X [05 Marks]")).toBe(5);
    expect(marksIn("Explain X 6M")).toBe(6);
    expect(marksIn("Explain X")).toBeUndefined();
    expect(guessType("Prove that the curl is zero", 5)).toBe("derivation");
    expect(guessType("Define flux", 2)).toBe("short");
  });

  it("returns nothing for text with no questions", () => {
    expect(rulePattern("hello", 1)).toBeUndefined();
  });
});

describe("joining the AI's readings of a long paper", () => {
  it("merges sections with the same name across chunks and adds up the marks", () => {
    const p = patternFromExtractions(
      [
        {
          minutes: 120,
          sections: [
            { name: "Part A", questions: [{ marks: 1, type: "mcq", text: "Pick one" }] },
            {
              name: "Part B",
              attempt: 2,
              questions: [{ marks: 5, type: "short", text: "Explain" }],
            },
          ],
        },
        {
          sections: [
            {
              name: "part b",
              questions: [
                { marks: 5, type: "long", text: "Discuss" },
                { marks: 5, type: "numerical", text: "Find" },
              ],
            },
          ],
        },
      ],
      7,
    )!;
    expect(p.sections).toHaveLength(2);
    expect(p.sections[1].questions).toHaveLength(3);
    expect(p.sections[1].attempt).toBe(2);
    expect(p.totalMarks).toBe(patternMarks(p));
    expect(p.totalMarks).toBe(11);
    expect(p.minutes).toBe(120);
    expect(patternFromExtractions([], 1)).toBeUndefined();
  });

  it("cuts long papers into chunks at line breaks", () => {
    const text = Array.from(
      { length: 400 },
      (_, i) => `${i + 1}. Question number ${i + 1} (5)`,
    ).join("\n");
    const chunks = chunkPaper(text, 2000);
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.every((c) => c.length <= 2000)).toBe(true);
    expect(chunks.join("\n").replace(/\s/g, "")).toBe(text.replace(/\s/g, ""));
  });
});
