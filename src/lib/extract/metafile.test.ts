import { describe, expect, it } from "vitest";
import { layoutEquation, metafileText } from "@/lib/extract/metafile";
import { makeWmf } from "@/lib/extract/testFixtures";

describe("equations saved as pictures (Equation 3.0 / MathType)", () => {
  it("rebuilds fractions, subscripts and Symbol-font letters from a WMF", () => {
    // ∂f/∂x Δx with f(x₀): the same records Equation 3.0 writes.
    const wmf = makeWmf([
      { font: { size: 384, face: "Times New Roman" } },
      { text: "f(x", x: 0, y: 1200 },
      { text: ")=", x: 520, y: 1200 },
      { text: "f", x: 3300, y: 960 },
      { text: "x", x: 3300, y: 1500 },
      { font: { size: 224, face: "Times New Roman" } },
      { text: "0", x: 400, y: 1300 },
      { font: { size: 384, face: "Symbol" } },
      { text: "¶", x: 3100, y: 960 },
      { text: "¶", x: 3100, y: 1500 },
      { text: "D", x: 3800, y: 1200 },
      { bar: { x1: 3080, x2: 3500, y: 1100 } },
      { font: { size: 384, face: "Times New Roman" } },
      { text: "x", x: 4050, y: 1200 },
    ]);
    expect(metafileText(wmf)).toBe("f(x_0)= (∂f)/(∂x) Δx");
  });

  it("puts the limits of a big ∑ and an exponent after the right symbol", () => {
    const pieces = [
      { text: "∑", x: 100, y: 1290, size: 576 },
      { text: "n", x: 120, y: 1560, size: 224 },
      { text: "=", x: 246, y: 1560, size: 224 },
      { text: "0", x: 378, y: 1560, size: 224 },
      { text: "∞", x: 220, y: 800, size: 224 },
      { text: "y", x: 700, y: 1200, size: 384 },
      { text: "2", x: 900, y: 1000, size: 224 },
      { text: "e", x: 1050, y: 1200, size: 384 },
      { text: "xy", x: 1250, y: 1000, size: 224 },
    ];
    expect(layoutEquation(pieces, [])).toBe("∑_(n=0)^∞y^2e^(xy)");
  });

  it("keeps separate lines apart and returns nothing for a picture without text", () => {
    const pieces = [
      { text: "for two variables:", x: 0, y: 340, size: 384 },
      { text: "a+b", x: 0, y: 1200, size: 384 },
    ];
    expect(layoutEquation(pieces, [])).toBe("for two variables:\na+b");
    expect(metafileText(makeWmf([]))).toBe("");
    expect(metafileText(new Uint8Array([1, 2, 3]))).toBe("");
  });
});
