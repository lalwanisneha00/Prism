import { describe, expect, it } from "vitest";
import {
  channelValue,
  coilAxialField,
  coilFieldAt,
  equivalenceVolume,
  flowMeterReading,
  heatExchanger,
  lissajousRatio,
  MU0,
  pendulumPeriod,
  springPeriod,
  thinLensImage,
  titrationPH,
} from "@/visuals/labs/labModels";

const near = (a: number, b: number, rel = 1e-3) =>
  expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.abs(b) * rel + 1e-15);

describe("coil field", () => {
  const coil = { x: 0, radius: 0.1, turns: 50, current: 2 };

  it("matches the textbook formula on the axis", () => {
    for (const x of [0, 0.05, 0.1, 0.2]) {
      const [bx, by] = coilFieldAt([coil], x, 0);
      near(bx, coilAxialField(coil, x));
      expect(Math.abs(by)).toBeLessThan(1e-9);
    }
    // At the centre: μ₀NI / 2R.
    near(coilAxialField(coil, 0), (MU0 * 50 * 2) / 0.2, 1e-9);
  });

  it("follows the coil when it is moved", () => {
    const moved = { ...coil, x: 0.15 };
    near(coilFieldAt([moved], 0.15, 0)[0], coilAxialField(coil, 0));
  });

  it("adds two coils, and Helmholtz spacing (d = R) makes the middle flat", () => {
    const pair = [
      { ...coil, x: -0.05 },
      { ...coil, x: 0.05 },
    ];
    const mid = coilFieldAt(pair, 0, 0)[0];
    near(mid, 2 * coilAxialField(coil, 0.05));
    // Within ±2 cm of the middle the field changes by well under 1%.
    expect(Math.abs(coilFieldAt(pair, 0.02, 0)[0] - mid) / mid).toBeLessThan(0.01);
  });

  it("cancels in the middle when the currents oppose", () => {
    const anti = [
      { ...coil, x: -0.05 },
      { ...coil, x: 0.05, current: -2 },
    ];
    expect(Math.abs(coilFieldAt(anti, 0, 0)[0])).toBeLessThan(1e-9);
  });

  it("turns the field with the coil", () => {
    const [bx, by] = coilFieldAt([{ ...coil, tiltDeg: 90 }], 0, 0);
    expect(Math.abs(bx)).toBeLessThan(1e-9);
    near(by, coilAxialField(coil, 0));
  });
});

describe("thin lens", () => {
  it("gives a real, inverted, same-size image at 2f", () => {
    const r = thinLensImage(20, 10);
    near(r.v, 20);
    near(r.magnification, -1);
    expect(r.real && !r.upright).toBe(true);
  });
  it("gives a virtual, upright, magnified image inside f", () => {
    const r = thinLensImage(5, 10);
    near(r.v, -10);
    expect(r.real).toBe(false);
    expect(r.upright).toBe(true);
    near(r.magnification, 2);
  });
  it("forms no image at the focus", () => {
    expect(thinLensImage(10, 10).atInfinity).toBe(true);
  });
  it("handles a diverging lens", () => {
    const r = thinLensImage(30, -15);
    near(r.v, -10);
    expect(r.upright).toBe(true);
  });
});

describe("oscillations", () => {
  it("pendulum: 1 m swings in about 2.006 s", () => {
    near(pendulumPeriod(1, 9.81, 0), 2.00607, 1e-4);
    // A 30° swing is slower by about 1.7%.
    near(pendulumPeriod(1, 9.81, 30) / pendulumPeriod(1, 9.81, 0), 1.0174, 1e-3);
  });
  it("spring: T = 2π√(m/k)", () => near(springPeriod(0.5, 20), Math.PI / Math.sqrt(10)));
});

describe("titration", () => {
  const strong = { acidConc: 0.1, acidVolume: 25, baseConc: 0.1, pKa: -6 };
  const weak = { ...strong, pKa: 4.76 };
  it("strong acid starts at pH 1 and is neutral at equivalence", () => {
    near(titrationPH(strong, 0), 1, 1e-3);
    near(titrationPH(strong, equivalenceVolume(strong)), 7, 1e-3);
    expect(titrationPH(strong, 50)).toBeGreaterThan(12);
  });
  it("weak acid: pH = pKa at half equivalence, basic at equivalence", () => {
    near(titrationPH(weak, 12.5), 4.76, 5e-3);
    const eq = titrationPH(weak, 25);
    expect(eq).toBeGreaterThan(8.5);
    expect(eq).toBeLessThan(9);
  });
  it("finds the equivalence volume", () => near(equivalenceVolume(strong), 25));
});

describe("heat exchanger", () => {
  const base = { hotIn: 90, coldIn: 20, hotRate: 2000, coldRate: 1000, ua: 1500 };
  for (const flow of ["parallel", "counter"] as const) {
    it(`${flow}: the march ends where ε-NTU says, and Q = UA × LMTD`, () => {
      const r = heatExchanger({ ...base, flow });
      const end = r.profile[r.profile.length - 1];
      near(end.hot, r.hotOut, 1e-4);
      near(end.cold, flow === "parallel" ? r.coldOut : base.coldIn, 1e-3);
      near(r.heat, base.ua * r.lmtd, 1e-3);
    });
  }
  it("counter flow moves more heat than parallel flow", () => {
    expect(heatExchanger({ ...base, flow: "counter" }).heat).toBeGreaterThan(
      heatExchanger({ ...base, flow: "parallel" }).heat,
    );
  });
});

describe("flow meter", () => {
  it("gives the textbook venturi reading", () => {
    // 5 L/s through a 100 mm / 50 mm venturi with Cd 0.98.
    const r = flowMeterReading({ flow: 0.005, pipeD: 0.1, throatD: 0.05, cd: 0.98 });
    near(r.throatVelocity, 0.005 / ((Math.PI * 0.05 ** 2) / 4));
    // Δp = ρ (Q/(Cd A2))² (1 − β⁴) / 2
    const ideal = 0.005 / 0.98 / ((Math.PI * 0.05 ** 2) / 4);
    near(r.pressureDrop, (1000 * ideal ** 2 * (1 - 1 / 16)) / 2);
    near(r.manometer, r.pressureDrop / (12600 * 9.81));
  });
});

describe("oscilloscope", () => {
  it("draws a sine with phase", () => {
    near(channelValue({ amplitude: 2, frequency: 1, phaseDeg: 90 }, 0), 2);
  });
  it("finds Lissajous ratios", () => {
    expect(lissajousRatio(100, 200)).toEqual([1, 2]);
    expect(lissajousRatio(300, 200)).toEqual([3, 2]);
    expect(lissajousRatio(100, 314.159)).toBeNull();
  });
});
