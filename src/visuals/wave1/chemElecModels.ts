/*
 * Models behind the Engineering Chemistry, Basic Electrical and Basic Electronics widgets
 * (V3 · Step 7). Pure and tested (chemElecModels.test.ts).
 */

// ---------------------------------------------------------------- chemistry

/** Beer–Lambert law: absorbance A = ε l c, transmittance T = 10^(−A). */
export function beerLambert(epsilon: number, pathCm: number, concMolar: number) {
  const absorbance = epsilon * pathCm * concMolar;
  return { absorbance, transmittance: 10 ** -absorbance };
}

export const R_GAS = 8.314462618; // J/(mol·K)
export const FARADAY = 96485.33212; // C/mol

/** Nernst equation: E = E° − (RT / nF) ln Q. */
export function nernst(e0: number, n: number, q: number, tempK = 298.15): number {
  return e0 - ((R_GAS * tempK) / (n * FARADAY)) * Math.log(q);
}

/** ΔG = −nFE (J/mol); negative means the cell reaction is spontaneous. */
export function gibbsFromEmf(n: number, emf: number): number {
  return -n * FARADAY * emf;
}

/*
 * Water's phase diagram, simplified but with real anchor points: triple point 273.16 K,
 * 611.657 Pa; critical point 647.096 K, 22.064 MPa; normal boiling point 373.15 K at
 * 101.325 kPa. The vapour-pressure curve uses the Clausius–Clapeyron shape fitted through
 * the triple point, the normal boiling point and the critical point; the melting curve is steep with a negative slope
 * (about −1.3 × 10⁷ Pa/K), which is why ice melts under pressure.
 */
export const WATER = {
  triple: { t: 273.16, p: 611.657 },
  critical: { t: 647.096, p: 22.064e6 },
};
const BOIL = { t: 373.15, p: 101325 };
// Clausius–Clapeyron segments: triple point → normal boiling point → critical point.
const K_LOW = Math.log(BOIL.p / WATER.triple.p) / (1 / WATER.triple.t - 1 / BOIL.t);
const K_HIGH = Math.log(WATER.critical.p / BOIL.p) / (1 / BOIL.t - 1 / WATER.critical.t);
const SUBLIMATION_L_OVER_R = 6140; // K (ΔH_sub ≈ 51 kJ/mol)

/** Pressure on the liquid–vapour (or solid–vapour below the triple point) line at T. */
export function waterVapourPressure(t: number): number {
  if (t < WATER.triple.t) {
    return WATER.triple.p * Math.exp(SUBLIMATION_L_OVER_R * (1 / WATER.triple.t - 1 / t));
  }
  if (t <= BOIL.t) return WATER.triple.p * Math.exp(K_LOW * (1 / WATER.triple.t - 1 / t));
  return BOIL.p * Math.exp(K_HIGH * (1 / BOIL.t - 1 / t));
}

/** Temperature of the solid–liquid line at pressure p. */
export function waterMeltingT(p: number): number {
  return WATER.triple.t - (p - WATER.triple.p) / 1.3e7;
}

export type Phase = "solid" | "liquid" | "vapour" | "supercritical";
export function waterPhase(t: number, p: number): Phase {
  if (t > WATER.critical.t && p > WATER.critical.p) return "supercritical";
  const aboveVapourLine = p > waterVapourPressure(t);
  if (aboveVapourLine && t < waterMeltingT(p)) return "solid";
  if (aboveVapourLine && t <= WATER.critical.t) return "liquid";
  return "vapour";
}

/** Gibbs' phase rule: degrees of freedom F = C − P + 2. */
export function phaseRuleFreedom(components: number, phases: number): number {
  return components - phases + 2;
}

// ---------------------------------------------------------------- basic electrical

/** Line and phase quantities for a balanced three-phase load. */
export function threePhase(
  connection: "star" | "delta",
  lineVoltage: number,
  phaseImpedance: number,
  pfAngleDeg: number,
) {
  const vPhase = connection === "star" ? lineVoltage / Math.sqrt(3) : lineVoltage;
  const iPhase = vPhase / phaseImpedance;
  const iLine = connection === "star" ? iPhase : iPhase * Math.sqrt(3);
  const pf = Math.cos((pfAngleDeg * Math.PI) / 180);
  const power = Math.sqrt(3) * lineVoltage * iLine * pf;
  return { vPhase, iPhase, iLine, power, pf };
}

/** RC charging: v_C(t) = V (1 − e^(−t/τ)); RL: i(t) = (V/R)(1 − e^(−t/τ)), τ = L/R. */
export function firstOrderRise(t: number, final: number, tau: number): number {
  return final * (1 - Math.exp(-t / tau));
}

export function firstOrderDecay(t: number, initial: number, tau: number): number {
  return initial * Math.exp(-t / tau);
}

/** Transformer: secondary voltage, currents and efficiency at a given load. */
export function transformer({
  v1,
  n1,
  n2,
  loadKw,
  pf,
  coreLossW,
  fullLoadCuLossW,
  ratedKva,
}: {
  v1: number;
  n1: number;
  n2: number;
  loadKw: number;
  pf: number;
  coreLossW: number;
  fullLoadCuLossW: number;
  ratedKva: number;
}) {
  const v2 = (v1 * n2) / n1;
  const kva = pf > 0 ? loadKw / pf : 0;
  const fraction = kva / ratedKva;
  const cuLoss = fullLoadCuLossW * fraction * fraction;
  const output = loadKw * 1000;
  const efficiency = output > 0 ? output / (output + coreLossW + cuLoss) : 0;
  const i2 = kva > 0 ? (kva * 1000) / v2 : 0;
  const i1 = kva > 0 ? (kva * 1000) / v1 : 0;
  return { v2, i1, i2, cuLoss, efficiency, fraction };
}

/** The load fraction where efficiency is highest: copper loss = core loss. */
export function maxEfficiencyFraction(coreLossW: number, fullLoadCuLossW: number): number {
  return Math.sqrt(coreLossW / fullLoadCuLossW);
}

/**
 * Induction motor torque at slip s from the approximate equivalent circuit:
 * T ∝ s R2 / (R2² + (s X2)²). Returned in units where the maximum torque is 1.
 */
export function torqueSlip(s: number, r2: number, x2: number): number {
  const t = (s * r2) / (r2 * r2 + (s * x2) ** 2);
  const tMax = 1 / (2 * x2); // at s = R2/X2
  return t / tMax;
}

export function slipAtMaxTorque(r2: number, x2: number): number {
  return r2 / x2;
}

export function synchronousSpeed(freqHz: number, poles: number): number {
  return (120 * freqHz) / poles;
}

// ---------------------------------------------------------------- basic electronics

/** Shockley diode equation: I = Is (e^(V/(n Vt)) − 1). */
export function diodeCurrent(v: number, isat = 1e-14, ideality = 1, vt = 0.02585): number {
  return isat * (Math.exp(Math.min(v / (ideality * vt), 80)) - 1);
}

/** Rectifier output (ideal diodes with a constant drop) for an input sine of peak vp. */
export function rectified(kind: "half" | "full" | "bridge", vIn: number, drop = 0.7): number {
  const drops = kind === "bridge" ? 2 * drop : drop;
  if (kind === "half") return Math.max(0, vIn - drops);
  return Math.max(0, Math.abs(vIn) - drops);
}

/** Average (DC) output of a rectifier for peak input vp (diode drop ignored): Vp/π or 2Vp/π. */
export function rectifierDc(kind: "half" | "full", vp: number): number {
  return kind === "half" ? vp / Math.PI : (2 * vp) / Math.PI;
}

/** CE amplifier DC load line and the operating point for voltage-divider bias. */
export function loadLine({
  vcc,
  rc,
  re,
  r1,
  r2,
  beta,
  vbe = 0.7,
}: {
  vcc: number;
  rc: number;
  re: number;
  r1: number;
  r2: number;
  beta: number;
  vbe?: number;
}) {
  const vth = (vcc * r2) / (r1 + r2);
  const rth = (r1 * r2) / (r1 + r2);
  const ib = Math.max(0, (vth - vbe) / (rth + (beta + 1) * re));
  let ic = beta * ib;
  const icSat = vcc / (rc + re);
  const saturated = ic >= icSat;
  if (saturated) ic = icSat;
  const vce = Math.max(0, vcc - ic * (rc + re));
  return { ib, ic, vce, icSat, vceCutoff: vcc, saturated, cutoff: ib === 0 };
}

/** Closed-loop gain of an ideal op-amp stage. */
export function opAmpGain(kind: "inverting" | "non-inverting", rf: number, rin: number): number {
  return kind === "inverting" ? -rf / rin : 1 + rf / rin;
}

/** Ideal op-amp output, clipped at the supply rails. */
export function opAmpOutput(gain: number, vin: number, rail: number): number {
  return Math.max(-rail, Math.min(rail, gain * vin));
}

export type Gate = "AND" | "OR" | "NOT" | "NAND" | "NOR" | "XOR" | "XNOR";
export function gate(g: Gate, a: boolean, b = false): boolean {
  switch (g) {
    case "AND":
      return a && b;
    case "OR":
      return a || b;
    case "NOT":
      return !a;
    case "NAND":
      return !(a && b);
    case "NOR":
      return !(a || b);
    case "XOR":
      return a !== b;
    case "XNOR":
      return a === b;
  }
}

/** Half adder and full adder outputs. */
export function fullAdder(a: boolean, b: boolean, cin: boolean) {
  const sum = (a !== b) !== cin;
  const carry = (a && b) || (cin && a !== b);
  return { sum, carry };
}
