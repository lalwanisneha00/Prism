import { describe, expect, it } from "vitest";
import {
  boxEnergyEv,
  boxProbability,
  boxPsi,
  dampedDisplacement,
  dampingKind,
  drivenAmplitude,
  fringeWidth,
  harmonicFrequency,
  nodes,
  qualityFactor,
  slitIntensity,
  standingWave,
} from "@/visuals/wave1/physicsModels";

describe("oscillations", () => {
  it("starts at x0, decays with damping, and classifies the damping", () => {
    expect(dampedDisplacement(0, 1, 2, 0.3)).toBeCloseTo(1);
    expect(Math.abs(dampedDisplacement(20, 1, 2, 0.3))).toBeLessThan(0.01);
    expect(dampedDisplacement(0, 1, 2, 2)).toBeCloseTo(1);
    expect(dampedDisplacement(0, 1, 2, 5)).toBeCloseTo(1);
    expect(dampedDisplacement(1, 1, 2, 5)).toBeGreaterThan(0); // heavy: no overshoot
    expect(dampingKind(2, 0)).toBe("undamped");
    expect(dampingKind(2, 2)).toBe("critical");
    expect(dampingKind(2, 1)).toBe("light");
    expect(qualityFactor(10, 0.5)).toBe(10);
  });
  it("peaks near the natural frequency when lightly damped (resonance)", () => {
    const w0 = 5;
    const amps = [3, 4.9, 7].map((w) => drivenAmplitude(w, w0, 0.1));
    expect(amps[1]).toBeGreaterThan(amps[0]);
    expect(amps[1]).toBeGreaterThan(amps[2]);
  });
});

describe("waves", () => {
  it("has nodes at the ends and n−1 inside, and f_n = n f_1", () => {
    expect(standingWave(0, 0.3, 3, 2, 1, 5)).toBeCloseTo(0);
    expect(standingWave(2, 0.3, 3, 2, 1, 5)).toBeCloseTo(0);
    expect(nodes(3, 3)).toEqual([0, 1, 2, 3]);
    expect(harmonicFrequency(2, 1, 100, 0.01)).toBeCloseTo(2 * harmonicFrequency(1, 1, 100, 0.01));
    expect(harmonicFrequency(1, 0.5, 100, 0.01)).toBeCloseTo(100);
  });
});

describe("interference and diffraction", () => {
  it("is brightest in the centre and dark at the first single-slit minimum (a sinθ = λ)", () => {
    const a = 2e-6;
    const l = 500e-9;
    expect(slitIntensity(0, 1, a, 0, l)).toBe(1);
    expect(slitIntensity(l / a, 1, a, 0, l)).toBeCloseTo(0);
  });
  it("puts double-slit bright fringes at d sinθ = mλ and gives β = λD/d", () => {
    const d = 10e-6;
    const l = 500e-9;
    expect(slitIntensity(l / d, 2, 1e-7, d, l)).toBeCloseTo(1, 1);
    expect(slitIntensity(l / (2 * d), 2, 1e-7, d, l)).toBeCloseTo(0);
    expect(fringeWidth(600e-9, 1, 0.5e-3)).toBeCloseTo(1.2e-3);
  });
});

describe("particle in a box", () => {
  it("has E ∝ n² (about 0.376 eV for an electron in a 1 nm box) and a normalised ψ", () => {
    expect(boxEnergyEv(1, 1e-9)).toBeCloseTo(0.376, 2);
    expect(boxEnergyEv(2, 1e-9) / boxEnergyEv(1, 1e-9)).toBeCloseTo(4);
    expect(boxProbability(1, 0, 1, 1)).toBeCloseTo(1, 3);
    expect(boxProbability(2, 0, 0.5, 1)).toBeCloseTo(0.5, 3);
    expect(boxPsi(2, 0.5, 1)).toBeCloseTo(0);
    expect(boxPsi(1, 1.5, 1)).toBe(0);
  });
});
