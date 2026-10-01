import { describe, expect, it } from "vitest";
import {
  coilEmf,
  coilFlux,
  coulombForce,
  enclosedCharge,
  fieldAt,
  fieldLines,
  gaussFlux,
  parallelPlate,
  rms,
  seriesCircuit,
  siFormat,
  wireField,
} from "@/visuals/physics";

const bounds = { xMin: -4, xMax: 4, yMin: -3, yMax: 3 };

describe("electrostatics", () => {
  it("Coulomb force: two 1 µC charges 1 m apart repel with 8.99 mN", () => {
    expect(coulombForce(1e-6, 1e-6, 1)).toBeCloseTo(8.99e-3, 5);
    expect(coulombForce(1e-6, -1e-6, 1)).toBeLessThan(0);
    // Inverse square: double the distance, a quarter of the force.
    expect(coulombForce(1e-6, 1e-6, 2) / coulombForce(1e-6, 1e-6, 1)).toBeCloseTo(0.25, 10);
  });

  it("field points away from + and towards −", () => {
    expect(fieldAt([{ q: 1, x: 0, y: 0 }], 1, 0).ex).toBeGreaterThan(0);
    expect(fieldAt([{ q: -1, x: 0, y: 0 }], 1, 0).ex).toBeLessThan(0);
  });

  it("field cancels midway between equal like charges", () => {
    const f = fieldAt(
      [
        { q: 1, x: -1, y: 0 },
        { q: 1, x: 1, y: 0 },
      ],
      0,
      0,
    );
    expect(Math.hypot(f.ex, f.ey)).toBeCloseTo(0, 10);
  });

  it("dipole field lines leave + and end on −", () => {
    const dipole = [
      { q: 1, x: -1, y: 0 },
      { q: -1, x: 1, y: 0 },
    ];
    const lines = fieldLines(dipole, bounds);
    expect(lines).toHaveLength(8);
    // The line heading straight at the negative charge must arrive there.
    const towards = lines.map((l) => l[l.length - 1]).filter((p) => Math.hypot(p.x - 1, p.y) < 0.1);
    expect(towards.length).toBeGreaterThan(0);
  });

  it("draws more lines for bigger charges", () => {
    expect(fieldLines([{ q: 2, x: 0, y: 0 }], bounds)).toHaveLength(16);
    expect(fieldLines([{ q: -1, x: 0, y: 0 }], bounds)).toHaveLength(8);
  });

  it("Gauss: only charges inside the surface count", () => {
    const charges = [
      { q: 2, x: 0, y: 0 },
      { q: -1, x: 0.5, y: 0 },
      { q: 5, x: 3, y: 0 },
    ];
    expect(enclosedCharge(charges, 0, 0, 1)).toBe(1);
    expect(gaussFlux(2e-6)).toBeCloseTo(2.259e5, -2);
  });
});

describe("capacitors", () => {
  it("parallel plate: 100 cm², 1 mm gap, air → 88.5 pF", () => {
    const c = parallelPlate({ areaM2: 0.01, gapM: 0.001, kappa: 1, volts: 10 });
    expect(c.capacitance).toBeCloseTo(8.854e-11, 13);
    expect(c.charge).toBeCloseTo(8.854e-10, 12);
    expect(c.field).toBe(10000);
    expect(c.energy).toBeCloseTo(4.427e-9, 11);
  });

  it("a dielectric multiplies the capacitance by kappa", () => {
    const air = parallelPlate({ areaM2: 0.01, gapM: 0.001, kappa: 1, volts: 1 });
    const glass = parallelPlate({ areaM2: 0.01, gapM: 0.001, kappa: 5, volts: 1 });
    expect(glass.capacitance / air.capacitance).toBeCloseTo(5, 10);
  });
});

describe("magnetism and induction", () => {
  it("wire field: 10 A at 10 cm → 20 µT", () => {
    expect(wireField(10, 0.1)).toBeCloseTo(2e-5, 9);
  });

  it("coil flux peaks when the magnet is at the centre", () => {
    expect(coilFlux(0)).toBe(1);
    expect(coilFlux(1)).toBeLessThan(1);
    expect(coilFlux(-2)).toBeCloseTo(coilFlux(2), 12);
  });

  it("EMF changes sign as the magnet passes through (Lenz)", () => {
    expect(coilEmf(-1, 1, 50)).toBeLessThan(0);
    expect(coilEmf(1, 1, 50)).toBeGreaterThan(0);
    expect(coilEmf(0, 1, 50)).toBeCloseTo(0, 6);
    // Faster magnet, bigger EMF; more turns, bigger EMF.
    expect(Math.abs(coilEmf(1, 2, 50))).toBeCloseTo(2 * Math.abs(coilEmf(1, 1, 50)), 6);
    expect(Math.abs(coilEmf(1, 1, 100))).toBeCloseTo(2 * Math.abs(coilEmf(1, 1, 50)), 6);
  });
});

describe("circuits and AC", () => {
  it("series circuit: 12 V across 2 Ω + 4 Ω → 2 A, drops 4 V and 8 V", () => {
    const c = seriesCircuit(12, [2, 4]);
    expect(c.current).toBe(2);
    expect(c.drops).toEqual([4, 8]);
    expect(c.power).toBe(24);
  });

  it("RMS of a 325 V peak is about 230 V", () => {
    expect(rms(325)).toBeCloseTo(229.8, 1);
  });

  it("formats values with SI prefixes", () => {
    expect(siFormat(2e-5, "T")).toBe("20 µT");
    expect(siFormat(8.854e-11, "F")).toBe("88.5 pF");
    expect(siFormat(2.259e5, "N·m²/C")).toBe("226 kN·m²/C");
  });
});
