import { describe, expect, it } from "vitest";
import {
  ELECTRON_E_OVER_M,
  eOverM,
  electronSpeed,
  hallCoefficient,
  hallVoltage,
  hysteresisLoop,
  loopArea,
  ringDiameter,
  ringIntensity,
  thomsonBeam,
  wavelengthFromRings,
} from "@/visuals/labs/physicsLabModels";

describe("Newton's rings", () => {
  it("gets the sodium wavelength back from two ring diameters", () => {
    const lambda = 589.3e-9;
    const R = 1;
    const d5 = ringDiameter(5, lambda, R);
    const d15 = ringDiameter(15, lambda, R);
    expect(wavelengthFromRings(d5, d15, 10, R)).toBeCloseTo(lambda, 12);
    // A typical lab ring: about 3.4 mm across for n = 5.
    expect(d5 * 1000).toBeCloseTo(3.43, 1);
  });

  it("has a dark centre and dark rings at the ring radii", () => {
    expect(ringIntensity(0, 589e-9, 1)).toBeCloseTo(0, 6);
    const r3 = ringDiameter(3, 589e-9, 1) / 2;
    expect(ringIntensity(r3, 589e-9, 1)).toBeCloseTo(0, 6);
  });
});

describe("Hall effect", () => {
  it("gives a few millivolts for a germanium-like slab", () => {
    const v = hallVoltage(5e-3, 0.3, 0.5e-3, 1e21);
    expect(v * 1000).toBeCloseTo(18.7, 0);
    expect(hallCoefficient(1e21, "n")).toBeLessThan(0);
    expect(hallCoefficient(1e21, "p")).toBeGreaterThan(0);
  });
});

describe("hysteresis loop", () => {
  it("passes through the remanence at H = 0 and zero at the coercivity", () => {
    const { rising, falling } = hysteresisLoop(1.5, 1.0, 400);
    expect(falling(0)).toBeCloseTo(1.0, 6);
    expect(rising(0)).toBeCloseTo(-1.0, 6);
    expect(rising(400)).toBeCloseTo(0, 6);
  });

  it("has a larger area for a harder material", () => {
    expect(loopArea(1.5, 1.0, 2000, 8000)).toBeGreaterThan(loopArea(1.5, 1.0, 100, 8000));
  });
});

describe("Thomson's e/m tube", () => {
  it("goes straight when E = vB and recovers e/m", () => {
    const V = 2000;
    const v = electronSpeed(V);
    const B = 1e-3;
    const E = v * B;
    const beam = thomsonBeam(V, E, B, 0.05, 0.15);
    expect(beam.balanced).toBe(true);
    expect(Math.abs(beam.spot)).toBeLessThan(1e-9);
    expect(eOverM(V, E, B) / ELECTRON_E_OVER_M).toBeCloseTo(1, 6);
  });

  it("bends up with only the electric field", () => {
    expect(thomsonBeam(2000, 2e4, 0, 0.05, 0.15).spot).toBeGreaterThan(0);
  });
});
