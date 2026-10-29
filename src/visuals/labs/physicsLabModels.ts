/*
 * Maths for the physics lab simulations added in the syllabus fix (Phase 7C fixes): Newton's rings,
 * the Hall effect, the B-H hysteresis loop and Thomson's e/m tube. SI units unless named.
 */

export const ELECTRON_CHARGE = 1.602176634e-19;
export const ELECTRON_E_OVER_M = 1.75882001076e11;

/** Diameter (m) of the nth dark ring in reflected light: D² = 4nλR/μ. */
export function ringDiameter(n: number, wavelengthM: number, radiusM: number, mu = 1): number {
  return 2 * Math.sqrt((n * wavelengthM * radiusM) / mu);
}

/** Wavelength back from two ring diameters p rings apart: λ = (D²ₙ₊ₚ − D²ₙ) / 4pR. */
export function wavelengthFromRings(dn: number, dnp: number, p: number, radiusM: number): number {
  return (dnp * dnp - dn * dn) / (4 * p * radiusM);
}

/**
 * Brightness (0 dark to 1 bright) at distance r from the centre in reflected light: the air film
 * is t = r²/2R thick, so the path difference is 2μt plus half a wave from the reflection.
 */
export function ringIntensity(r: number, wavelengthM: number, radiusM: number, mu = 1): number {
  const t = (r * r) / (2 * radiusM);
  const phase = (2 * Math.PI * 2 * mu * t) / wavelengthM + Math.PI;
  return (1 + Math.cos(phase)) / 2;
}

/** Hall voltage (V) for current I (A) through a slab of thickness t (m) in field B (T). */
export function hallVoltage(current: number, field: number, thickness: number, density: number) {
  return (current * field) / (density * ELECTRON_CHARGE * thickness);
}

/** Hall coefficient R_H = 1 / nq (m³/C), negative for electrons. */
export function hallCoefficient(density: number, type: "n" | "p") {
  return (type === "n" ? -1 : 1) / (density * ELECTRON_CHARGE);
}

/**
 * A B-H loop from three numbers a lab measures: saturation Bs, remanence Br and coercivity Hc.
 * Each branch is B = Bs·tanh((H ± Hc)/a), with a chosen so that B = ±Br at H = 0.
 */
export function hysteresisLoop(bs: number, br: number, hc: number) {
  const a = hc / Math.atanh(Math.min(0.999, br / bs));
  return {
    rising: (h: number) => bs * Math.tanh((h - hc) / a),
    falling: (h: number) => bs * Math.tanh((h + hc) / a),
  };
}

/** Energy lost per cycle per cubic metre (J/m³): the loop's area, between ±hMax. */
export function loopArea(bs: number, br: number, hc: number, hMax: number, steps = 400) {
  const { rising, falling } = hysteresisLoop(bs, br, hc);
  let area = 0;
  const dh = (2 * hMax) / steps;
  for (let i = 0; i < steps; i++) {
    const h = -hMax + (i + 0.5) * dh;
    area += (falling(h) - rising(h)) * dh;
  }
  return area;
}

/** Electron speed (m/s) after an accelerating voltage V: v = √(2(e/m)V). */
export function electronSpeed(anodeV: number) {
  return Math.sqrt(2 * ELECTRON_E_OVER_M * anodeV);
}

/**
 * Thomson's tube: the beam enters plates of length L with speed v; the electric force (field E,
 * pushing up) and the magnetic force (field B, pushing down) act together inside the plates, then
 * the beam travels straight to the screen a distance S further on. Returns the spot's height (m),
 * the beam's path as points (x, y in m) and whether the forces balance.
 */
export function thomsonBeam(anodeV: number, field: number, magnetic: number, L: number, S: number) {
  const v = electronSpeed(anodeV);
  const accel = ELECTRON_E_OVER_M * (field - v * magnetic);
  const tIn = L / v;
  const points: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const t = (tIn * i) / 24;
    points.push([v * t, 0.5 * accel * t * t]);
  }
  const yOut = 0.5 * accel * tIn * tIn;
  const slope = (accel * tIn) / v;
  const spot = yOut + slope * S;
  points.push([L + S, spot]);
  return { v, spot, points, balanced: Math.abs(field - v * magnetic) <= 0.02 * field };
}

/** e/m from a balanced beam: v = E/B and ½mv² = eV, so e/m = E² / (2VB²). */
export function eOverM(anodeV: number, field: number, magnetic: number) {
  return (field * field) / (2 * anodeV * magnetic * magnetic);
}
