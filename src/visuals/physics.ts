/*
 * The physics behind the widgets. Pure functions, unit-tested against textbook values,
 * so a widget can only ever draw what the equations say.
 */

export const K = 8.9875517923e9; // Coulomb constant, N·m²/C²
export const EPSILON_0 = 8.8541878128e-12; // F/m
export const MU_0 = 1.25663706212e-6; // N/A²

export type PointCharge = { q: number; x: number; y: number };
export type Point = { x: number; y: number };
export type Bounds = { xMin: number; xMax: number; yMin: number; yMax: number };

/** Coulomb force in newtons. Positive = repulsive, negative = attractive. */
export function coulombForce(q1: number, q2: number, r: number): number {
  return (K * q1 * q2) / (r * r);
}

/** Electric field direction and relative strength at (x, y), with k = 1 (drawing units). */
export function fieldAt(charges: PointCharge[], x: number, y: number): { ex: number; ey: number } {
  let ex = 0;
  let ey = 0;
  for (const c of charges) {
    const dx = x - c.x;
    const dy = y - c.y;
    const r2 = dx * dx + dy * dy;
    if (r2 < 1e-9) continue;
    const r3 = r2 * Math.sqrt(r2);
    ex += (c.q * dx) / r3;
    ey += (c.q * dy) / r3;
  }
  return { ex, ey };
}

const inside = (p: Point, b: Bounds, margin = 0.5) =>
  p.x > b.xMin - margin && p.x < b.xMax + margin && p.y > b.yMin - margin && p.y < b.yMax + margin;

/** Follows the field from `start` (direction +1 along E, -1 against it) until it hits a charge or leaves. */
export function traceFieldLine(
  charges: PointCharge[],
  start: Point,
  direction: 1 | -1,
  bounds: Bounds,
  step = 0.04,
  maxSteps = 600,
): Point[] {
  const points: Point[] = [start];
  let p = start;
  for (let i = 0; i < maxSteps; i++) {
    const f1 = fieldAt(charges, p.x, p.y);
    const m1 = Math.hypot(f1.ex, f1.ey);
    if (m1 < 1e-9) break;
    // Midpoint (RK2) step for smooth, accurate curves.
    const mid = {
      x: p.x + (direction * step * f1.ex) / m1 / 2,
      y: p.y + (direction * step * f1.ey) / m1 / 2,
    };
    const f2 = fieldAt(charges, mid.x, mid.y);
    const m2 = Math.hypot(f2.ex, f2.ey);
    if (m2 < 1e-9) break;
    p = { x: p.x + (direction * step * f2.ex) / m2, y: p.y + (direction * step * f2.ey) / m2 };
    points.push(p);
    if (!inside(p, bounds)) break;
    if (charges.some((c) => Math.hypot(p.x - c.x, p.y - c.y) < step * 1.5)) break;
  }
  return points;
}

/** Field lines for a set of charges; the number leaving each charge is proportional to |q|. */
export function fieldLines(
  charges: PointCharge[],
  bounds: Bounds,
  linesPerUnitCharge = 8,
): Point[][] {
  const hasPositive = charges.some((c) => c.q > 0);
  // Lines start on positive charges; with only negative charges, trace backwards from them.
  const sources = charges.filter((c) => (hasPositive ? c.q > 0 : c.q < 0));
  const direction: 1 | -1 = hasPositive ? 1 : -1;
  const lines: Point[][] = [];
  for (const c of sources) {
    const n = Math.max(4, Math.round(Math.abs(c.q) * linesPerUnitCharge));
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * (i + 0.5)) / n;
      const start = { x: c.x + 0.12 * Math.cos(angle), y: c.y + 0.12 * Math.sin(angle) };
      lines.push(traceFieldLine(charges, start, direction, bounds));
    }
  }
  return lines;
}

/** Total charge inside a circle (a 2D slice of a spherical Gaussian surface). */
export function enclosedCharge(charges: PointCharge[], cx: number, cy: number, radius: number) {
  return charges
    .filter((c) => Math.hypot(c.x - cx, c.y - cy) < radius)
    .reduce((s, c) => s + c.q, 0);
}

/** Gauss's law: net electric flux through a closed surface, in N·m²/C. */
export function gaussFlux(enclosedCoulombs: number): number {
  return enclosedCoulombs / EPSILON_0;
}

/** Parallel-plate capacitor (SI units in, SI units out). */
export function parallelPlate({
  areaM2,
  gapM,
  kappa,
  volts,
}: {
  areaM2: number;
  gapM: number;
  kappa: number;
  volts: number;
}) {
  const capacitance = (kappa * EPSILON_0 * areaM2) / gapM;
  return {
    capacitance,
    charge: capacitance * volts,
    field: volts / gapM,
    energy: 0.5 * capacitance * volts * volts,
  };
}

/** Magnetic field of a long straight wire, in tesla. */
export function wireField(currentA: number, distanceM: number): number {
  return (MU_0 * currentA) / (2 * Math.PI * distanceM);
}

/**
 * Relative magnetic flux through a coil as a bar magnet's centre passes it at position x
 * (on-axis dipole profile, peak 1 at x = 0, width set by the coil radius a).
 */
export function coilFlux(x: number, a = 1): number {
  return 1 / Math.pow(1 + (x / a) ** 2, 1.5);
}

/** Faraday's law: EMF = -N dΦ/dt, for a magnet moving at constant speed v (relative units). */
export function coilEmf(x: number, speed: number, turns: number, a = 1): number {
  const h = 1e-4;
  const dPhiDx = (coilFlux(x + h, a) - coilFlux(x - h, a)) / (2 * h);
  return -turns * dPhiDx * speed;
}

/** A battery driving resistors in series: current and the voltage across each resistor. */
export function seriesCircuit(volts: number, ohms: number[]) {
  const total = ohms.reduce((s, r) => s + r, 0);
  const current = total > 0 ? volts / total : 0;
  return { totalOhms: total, current, drops: ohms.map((r) => current * r), power: volts * current };
}

/** RMS value of a sinusoid with peak value `peak`. */
export function rms(peak: number): number {
  return peak / Math.SQRT2;
}

/** Engineering-style formatting with SI prefixes: 2.26e-5 → "22.6 µ". */
export function siFormat(value: number, unit: string, digits = 3): string {
  if (value === 0 || !Number.isFinite(value)) return `0 ${unit}`;
  const prefixes: [number, string][] = [
    [1e9, "G"],
    [1e6, "M"],
    [1e3, "k"],
    [1, ""],
    [1e-3, "m"],
    [1e-6, "µ"],
    [1e-9, "n"],
    [1e-12, "p"],
  ];
  const abs = Math.abs(value);
  const [scale, prefix] = prefixes.find(([s]) => abs >= s) ?? prefixes[prefixes.length - 1];
  return `${Number((value / scale).toPrecision(digits))} ${prefix}${unit}`;
}
