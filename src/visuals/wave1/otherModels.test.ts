import { describe, expect, it } from "vitest";
import {
  applyMap,
  binarySearchSteps,
  callTree,
  cauchyRiemann,
  conicName,
  conicPoints,
  contourIntegral,
  countCalls,
  doublingTime,
  energyPyramid,
  incline,
  logisticGrowth,
  projectile,
  rainwaterLitres,
  resultant,
  roulette,
  solidViews,
  sortSteps,
} from "@/visuals/wave1/otherModels";

describe("mechanics", () => {
  it("adds forces by components", () => {
    const r = resultant([
      { magnitude: 3, angleDeg: 0 },
      { magnitude: 4, angleDeg: 90 },
    ]);
    expect(r.magnitude).toBeCloseTo(5);
    expect(r.angleDeg).toBeCloseTo(53.13, 1);
    expect(
      resultant([
        { magnitude: 10, angleDeg: 0 },
        { magnitude: 10, angleDeg: 180 },
      ]).magnitude,
    ).toBeCloseTo(0);
  });
  it("a block slides once tan θ exceeds μs", () => {
    expect(incline(20, 0.5, 0.4).slides).toBe(false);
    const s = incline(35, 0.5, 0.4);
    expect(s.slides).toBe(true);
    expect(s.acceleration).toBeCloseTo(9.81 * (Math.sin(0.6109) - 0.4 * Math.cos(0.6109)), 2);
    expect(incline(0, 0.5, 0.4).angleOfRepose).toBeCloseTo(26.57, 1);
  });
  it("projectile range is greatest at 45° and R = u² sin2θ / g", () => {
    expect(projectile(20, 45).range).toBeCloseTo(400 / 9.81);
    expect(projectile(20, 30).range).toBeCloseTo(projectile(20, 60).range);
    expect(projectile(20, 90).maxHeight).toBeCloseTo(400 / (2 * 9.81));
  });
});

describe("graphics", () => {
  it("names conics by eccentricity and keeps PF = e · (distance to directrix)", () => {
    expect([0, 0.5, 1, 1.5].map(conicName)).toEqual(["circle", "ellipse", "parabola", "hyperbola"]);
    // Directrix x = −4: PF = e · (x + 4) for every point.
    const pts = conicPoints(0.6, 4, 36);
    expect(pts.length).toBeGreaterThan(30);
    for (const p of pts) expect(Math.hypot(p.x, p.y)).toBeCloseTo(0.6 * (p.x + 4));
  });
  it("a cycloid's point touches the ground after a full turn, and an involute starts on the base circle", () => {
    const p = roulette("cycloid", 2 * Math.PI, 1, 0);
    expect(p.x).toBeCloseTo(2 * Math.PI);
    expect(p.y).toBeCloseTo(0);
    expect(roulette("involute", 0, 0, 2)).toEqual({ x: 2, y: 0 });
  });
  it("draws a pyramid's front view as a triangle and a cylinder's top view as a circle", () => {
    expect(solidViews("pyramid", 2, 3).front).toHaveLength(3);
    expect(solidViews("cylinder", 2, 3).top.shape).toBe("circle");
    expect(solidViews("cone", 2, 3).top.apex).toBe(true);
  });
});

describe("programming", () => {
  it("every sort ends sorted", () => {
    const input = [5, 1, 4, 2, 3];
    for (const algo of ["bubble", "insertion", "selection"] as const) {
      expect(sortSteps(algo, input).at(-1)!.array).toEqual([1, 2, 3, 4, 5]);
    }
    expect(sortSteps("bubble", [2, 1])[1].note).toContain("swap");
  });
  it("binary search halves the range and reports not-found", () => {
    const a = [1, 3, 5, 7, 9, 11, 13];
    const steps = binarySearchSteps(a, 11);
    expect(steps.at(-1)!.found).toBe(true);
    expect(steps.length).toBeLessThanOrEqual(3);
    expect(binarySearchSteps(a, 4).at(-1)!.note).toContain("not in");
  });
  it("builds call trees: fact(4) = 24 with 4 calls, fib(5) = 5 with 15 calls", () => {
    expect(callTree("factorial", 4).value).toBe(24);
    expect(countCalls(callTree("factorial", 4))).toBe(4);
    expect(callTree("fibonacci", 5).value).toBe(5);
    expect(countCalls(callTree("fibonacci", 5))).toBe(15);
  });
});

describe("environmental science", () => {
  it("keeps about 10% of energy per trophic level", () => {
    expect(energyPyramid(10000, 0.1, 4)).toEqual(
      [10000, 1000, 100, 10].map((v) => expect.closeTo(v)),
    );
  });
  it("logistic growth levels off at the carrying capacity", () => {
    expect(logisticGrowth(10, 0.5, 1000, 0)).toBeCloseTo(10);
    expect(logisticGrowth(10, 0.5, 1000, 60)).toBeCloseTo(1000, 0);
    expect(doublingTime(Math.log(2))).toBeCloseTo(1);
  });
  it("a 100 m² roof with 800 mm of rain and C = 0.8 collects 64,000 litres", () => {
    expect(rainwaterLitres(100, 800, 0.8)).toBeCloseTo(64000);
  });
});

describe("complex variables", () => {
  it("maps points correctly and satisfies Cauchy–Riemann for analytic maps", () => {
    expect(applyMap("z^2", { re: 1, im: 1 })).toEqual({ re: 0, im: 2 });
    const w = applyMap("1/z", { re: 0, im: 2 });
    expect(w.re).toBeCloseTo(0);
    expect(w.im).toBeCloseTo(-0.5);
    expect(applyMap("mobius", { re: 1, im: 0 })).toEqual({ re: 0, im: 0 });
    for (const m of ["z^2", "exp(z)", "sin(z)", "1/z", "mobius"] as const) {
      expect(cauchyRiemann(m, { re: 0.7, im: 0.4 }).holds, m).toBe(true);
    }
  });
  it("∮ dz/z around the origin is 2πi, and 0 when the pole is outside", () => {
    const pole = { re: 0, im: 0, residue: { re: 1, im: 0 } };
    const inside = contourIntegral(0, 0, 1, [pole]);
    expect(inside.re).toBeCloseTo(0);
    expect(inside.im).toBeCloseTo(2 * Math.PI);
    expect(contourIntegral(3, 0, 1, [pole]).im).toBeCloseTo(0);
  });
});
