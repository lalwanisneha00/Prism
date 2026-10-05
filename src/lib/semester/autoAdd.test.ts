import { describe, expect, it } from "vitest";
import { planSemesterUpload } from "@/lib/semester/autoAdd";
import { subjects } from "@/lib/subjects";
import { parseUniversitySyllabus } from "@/lib/university/parse";

const text = `Semester III
MA201 Engineering Mathematics III
Unit 1: Complex analysis - analytic functions, Cauchy-Riemann equations, contour integration
Unit 2: Fourier series - periodic functions, Fourier integral
HS201 Quantum Basket Weaving
Unit 1: Warp and weft - knots, loops, tension
Unit 2: Dyes - mordants, natural dyes
Semester IV
MA301 Probability
Unit 1: Random variables - discrete, continuous, expectation
`;

describe("planSemesterUpload", () => {
  const syllabus = parseUniversitySyllabus(text);

  it("puts a clearly matching subject on Prism's own, and anything else becomes the student's own", () => {
    const plan = planSemesterUpload(syllabus, subjects, 3);
    const byName = Object.fromEntries(plan.entries.map((e) => [e.uni.name, e.choice.kind]));
    expect(byName["Engineering Mathematics III"]).toBe("built-in");
    expect(byName["Quantum Basket Weaving"]).toBe("own");
  });

  it("keeps only the chosen semester when the file covers several", () => {
    const plan = planSemesterUpload(syllabus, subjects, 3);
    expect(plan.entries.every((e) => e.semester === 3)).toBe(true);
    expect(plan.otherSemesters).toBeGreaterThanOrEqual(1);
    expect(plan.semester).toBe(3);
  });

  it("uses the semester found in the file when none is chosen", () => {
    const one = parseUniversitySyllabus(text.split("Semester IV")[0]);
    expect(planSemesterUpload(one, subjects).semester).toBe(3);
  });

  it("places every subject in the chosen semester when the file names none", () => {
    const plain = parseUniversitySyllabus(
      "Engineering Mathematics III\nUnit 1: Complex analysis - analytic functions, contour integration\nUnit 2: Fourier series - periodic functions",
    );
    const plan = planSemesterUpload(plain, subjects, 5);
    expect(plan.entries.length).toBeGreaterThan(0);
    expect(plan.entries.every((e) => e.semester === 5)).toBe(true);
  });
});
