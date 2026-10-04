import { describe, expect, it } from "vitest";
import {
  clip,
  displayFormulas,
  keyPoints,
  latexToPlain,
  plainText,
  sentences,
} from "@/lib/slides/text";

describe("latexToPlain", () => {
  it("turns common maths into readable Unicode", () => {
    expect(latexToPlain("\\epsilon_0")).toBe("ε₀");
    expect(latexToPlain("E^2")).toBe("E²");
    expect(latexToPlain("\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\epsilon_0}")).toBe(
      "∇ · E⃗ = ρ/ε₀",
    );
    expect(latexToPlain("\\oint \\mathbf{E}\\cdot d\\mathbf{A}")).toBe("∮ E · dA");
    expect(latexToPlain("\\sqrt{a+b}")).toBe("√(a+b)");
  });
  it("never leaves braces or backslashes behind", () => {
    const out = latexToPlain("\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u");
    expect(out).not.toMatch(/[\\{}]/);
    expect(out).toContain("∂");
  });
});

describe("plainText", () => {
  it("drops markup and display maths but keeps inline maths readable", () => {
    const md =
      "## Gauss\n**Flux** is $\\Phi = q/\\epsilon_0$.\n\n$$\\oint E\\cdot dA$$\n\n- one\n- two";
    const out = plainText(md);
    expect(out).toContain("Flux is Φ = q/ε₀.");
    expect(out).not.toContain("oint");
    expect(out).not.toMatch(/[*#$]/);
  });
  it("finds display formulas", () => {
    expect(displayFormulas("a $$x^2$$ b $$y$$")).toEqual(["x^2", "y"]);
  });
});

describe("sentences and keyPoints", () => {
  it("keeps decimals and e.g. together", () => {
    expect(sentences("Pi is 3.14 here. Use e.g. this one. Done now.")).toHaveLength(3);
  });
  it("picks short points", () => {
    const pts = keyPoints(
      "First point is here. Second point is here too. Third one follows.",
      2,
      20,
    );
    expect(pts).toHaveLength(2);
    for (const p of pts) expect(p.length).toBeLessThanOrEqual(20);
  });
  it("clips at a word boundary", () => {
    expect(clip("one two three four", 10)).toBe("one two…");
    expect(clip("short", 10)).toBe("short");
  });
});
