import { describe, expect, it } from "vitest";
import { parseFormula, parseExpression } from "@/visuals/expression";
import {
  derivative,
  divCurl,
  eigen2x2,
  evalPolynomial,
  fitRange,
  fmt,
  maclaurinCoefficients,
  riemannSum,
  simpson,
  solveOde,
  waves,
} from "@/visuals/mathTools";

describe("calculus helpers", () => {
  it("differentiates and integrates numerically", () => {
    expect(derivative((x) => x ** 3, 2)).toBeCloseTo(12, 6);
    expect(derivative(Math.sin, 0)).toBeCloseTo(1, 6);
    expect(simpson((x) => x * x, 0, 3)).toBeCloseTo(9, 9);
    expect(simpson(Math.sin, 0, Math.PI, 101)).toBeCloseTo(2, 6);
  });

  it("builds Riemann sums that approach the integral", () => {
    const f = (x: number) => x * x;
    expect(riemannSum(f, 0, 1, 4, "left").total).toBeCloseTo(0.21875, 9);
    expect(riemannSum(f, 0, 1, 4, "right").total).toBeCloseTo(0.46875, 9);
    expect(riemannSum(f, 0, 1, 1000, "midpoint").total).toBeCloseTo(1 / 3, 6);
    expect(riemannSum(f, 0, 1, 4, "left").rects).toHaveLength(4);
  });
});

describe("series", () => {
  it("has the textbook Maclaurin coefficients", () => {
    expect(maclaurinCoefficients("sin", 5)).toEqual([0, 1, 0, -1 / 6, 0, 1 / 120]);
    expect(maclaurinCoefficients("cos", 4)).toEqual([1, 0, -1 / 2, 0, 1 / 24]);
    expect(maclaurinCoefficients("ln1p", 3)).toEqual([0, 1, -1 / 2, 1 / 3]);
    expect(evalPolynomial(maclaurinCoefficients("exp", 12), 1)).toBeCloseTo(Math.E, 8);
  });

  it("Fourier partial sums converge to the wave away from jumps", () => {
    expect(waves.square.partial(Math.PI / 2, 200)).toBeCloseTo(1, 2);
    expect(waves.sawtooth.partial(1, 2000)).toBeCloseTo(1, 2);
    expect(waves.triangle.partial(1, 50)).toBeCloseTo(1, 3);
    expect(waves.triangle.f(-1)).toBe(1);
  });
});

describe("linear algebra", () => {
  it("finds real eigenvalues and eigenvectors", () => {
    const e = eigen2x2(2, 1, 1, 2);
    expect(e.kind).toBe("real");
    if (e.kind !== "real" || !e.vectors) throw new Error("expected real eigenvectors");
    expect(e.values).toEqual([3, 1]);
    const [v] = e.vectors;
    // A v = 3 v
    expect(2 * v[0] + v[1]).toBeCloseTo(3 * v[0], 9);
    expect(v[0] + 2 * v[1]).toBeCloseTo(3 * v[1], 9);
  });

  it("reports complex eigenvalues for a rotation and handles λI", () => {
    expect(eigen2x2(0, -1, 1, 0)).toEqual({ kind: "complex", re: 0, im: 1 });
    expect(eigen2x2(2, 0, 0, 2)).toMatchObject({ kind: "real", values: [2, 2], vectors: null });
  });
});

describe("ODEs and fields", () => {
  it("solves dy/dx = y accurately with RK4", () => {
    const pts = solveOde((_x, y) => y, 0, 1, 1, 50);
    expect(pts.at(-1)!.y).toBeCloseTo(Math.E, 6);
  });

  it("computes divergence and curl", () => {
    // F = (x, y) spreads out (div 2, curl 0); F = (−y, x) spins (div 0, curl 2).
    expect(
      divCurl(
        (x) => x,
        (_x, y) => y,
        1,
        1,
      ).divergence,
    ).toBeCloseTo(2, 6);
    const spin = divCurl(
      (_x, y) => -y,
      (x) => x,
      0.5,
      -1,
    );
    expect(spin.divergence).toBeCloseTo(0, 6);
    expect(spin.curl).toBeCloseTo(2, 6);
  });
});

describe("formulas with several variables", () => {
  it("evaluates x, y and a parameter", () => {
    const f = parseFormula("x^2 - a*y", ["x", "y", "a"]);
    expect(f({ x: 3, y: 2, a: 1.5 })).toBe(6);
    expect(parseExpression("2x + 1")(4)).toBe(9);
    expect(() => parseFormula("xy", ["x", "y"])).toThrow(/unknown name "xy"/);
    expect(() => parseFormula("y", ["x"])).toThrow(/unknown name "y"/);
    expect(() => parseFormula("x", ["e"])).toThrow(/can't be a variable/);
  });

  it("formats readouts", () => {
    expect(fmt(3.14159)).toBe("3.14");
    expect(fmt(1e-12)).toBe("0");
    expect(fmt(Infinity)).toBe("undefined");
  });
});

describe("fitRange", () => {
  it("frames the values, includes 0 for mostly-positive data and ignores spikes", () => {
    const [lo, hi] = fitRange([1, 2, 3, 4]);
    expect(lo).toBeLessThanOrEqual(0);
    expect(hi).toBeGreaterThan(4);
    const spiky = [...Array.from({ length: 200 }, (_, i) => Math.sin(i)), 1e9];
    expect(fitRange(spiky)[1]).toBeLessThan(2);
    expect(fitRange([])).toEqual([-1, 1]);
    expect(fitRange([5, 5])[0]).toBeLessThan(5);
  });
});
