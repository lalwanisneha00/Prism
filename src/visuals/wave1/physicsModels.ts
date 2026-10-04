/*
 * The physics behind the Applied Physics widgets (V3 · Step 7). Pure functions, tested in
 * physicsModels.test.ts, so the pictures always show the textbook formulas.
 */

/** Displacement of a damped oscillator released from rest at x0: x(t) for ω0, damping γ (=b/2m). */
export function dampedDisplacement(t: number, x0: number, omega0: number, gamma: number): number {
  if (gamma < omega0) {
    const wd = Math.sqrt(omega0 * omega0 - gamma * gamma);
    return x0 * Math.exp(-gamma * t) * (Math.cos(wd * t) + (gamma / wd) * Math.sin(wd * t));
  }
  if (gamma === omega0) return x0 * Math.exp(-gamma * t) * (1 + gamma * t);
  const s = Math.sqrt(gamma * gamma - omega0 * omega0);
  const r1 = -gamma + s;
  const r2 = -gamma - s;
  // x(0) = x0, x'(0) = 0
  const a = (x0 * r2) / (r2 - r1);
  const b = x0 - a;
  return a * Math.exp(r1 * t) + b * Math.exp(r2 * t);
}

export type DampingKind = "undamped" | "light" | "critical" | "heavy";
export function dampingKind(omega0: number, gamma: number): DampingKind {
  if (gamma === 0) return "undamped";
  if (Math.abs(gamma - omega0) < 1e-9) return "critical";
  return gamma < omega0 ? "light" : "heavy";
}

/** Quality factor Q = ω0 / (2γ). */
export function qualityFactor(omega0: number, gamma: number): number {
  return gamma > 0 ? omega0 / (2 * gamma) : Infinity;
}

/** Steady-state amplitude of a driven oscillator per unit force/mass: 1/√((ω0²−ω²)² + (2γω)²). */
export function drivenAmplitude(omega: number, omega0: number, gamma: number): number {
  return 1 / Math.sqrt((omega0 ** 2 - omega ** 2) ** 2 + (2 * gamma * omega) ** 2);
}

/** Phase lag of the response behind the driving force, in radians (0 … π). */
export function drivenPhase(omega: number, omega0: number, gamma: number): number {
  return Math.atan2(2 * gamma * omega, omega0 ** 2 - omega ** 2);
}

/** Standing wave on a string fixed at both ends: y(x,t) = 2A sin(nπx/L) cos(ωt). */
export function standingWave(
  x: number,
  t: number,
  n: number,
  length: number,
  amp: number,
  omega: number,
) {
  return 2 * amp * Math.sin((n * Math.PI * x) / length) * Math.cos(omega * t);
}

/** Frequency of harmonic n on a string: f_n = n v / (2L), v = √(T/μ). */
export function harmonicFrequency(
  n: number,
  length: number,
  tension: number,
  massPerLength: number,
) {
  return (n * Math.sqrt(tension / massPerLength)) / (2 * length);
}

/** Node positions of harmonic n (including the fixed ends). */
export function nodes(n: number, length: number): number[] {
  return Array.from({ length: n + 1 }, (_, k) => (k * length) / n);
}

/**
 * Relative intensity on a far screen for N slits of width a and spacing d (Fraunhofer):
 * I = (sin β / β)² (sin Nα / N sin α)², β = πa sinθ/λ, α = πd sinθ/λ. N = 1 is a single slit.
 */
export function slitIntensity(
  sinTheta: number,
  n: number,
  widthM: number,
  spacingM: number,
  lambdaM: number,
) {
  const beta = (Math.PI * widthM * sinTheta) / lambdaM;
  const envelope = Math.abs(beta) < 1e-9 ? 1 : (Math.sin(beta) / beta) ** 2;
  if (n === 1) return envelope;
  const alpha = (Math.PI * spacingM * sinTheta) / lambdaM;
  const s = Math.sin(alpha);
  const grating = Math.abs(s) < 1e-9 ? 1 : (Math.sin(n * alpha) / (n * s)) ** 2;
  return envelope * grating;
}

/** Fringe width on a screen at distance D for double-slit spacing d: β = λD/d. */
export function fringeWidth(lambdaM: number, screenM: number, spacingM: number): number {
  return (lambdaM * screenM) / spacingM;
}

const HBAR = 1.054571817e-34;
const H = 6.62607015e-34;
const ELECTRON_MASS = 9.1093837015e-31;
const EV = 1.602176634e-19;

/** Energy of level n for a particle (default an electron) in a 1-D box of width L, in eV. */
export function boxEnergyEv(n: number, widthM: number, mass = ELECTRON_MASS): number {
  return (n * n * H * H) / (8 * mass * widthM * widthM) / EV;
}

/** Normalised wave function ψ_n(x) = √(2/L) sin(nπx/L) inside the box (0 outside). */
export function boxPsi(n: number, x: number, width: number): number {
  if (x < 0 || x > width) return 0;
  return Math.sqrt(2 / width) * Math.sin((n * Math.PI * x) / width);
}

/** Probability of finding the particle between x1 and x2 (numerical integral of |ψ|²). */
export function boxProbability(
  n: number,
  x1: number,
  x2: number,
  width: number,
  steps = 400,
): number {
  const a = Math.max(0, Math.min(x1, x2));
  const b = Math.min(width, Math.max(x1, x2));
  if (b <= a) return 0;
  let sum = 0;
  const h = (b - a) / steps;
  for (let i = 0; i < steps; i++) {
    const x = a + (i + 0.5) * h;
    sum += boxPsi(n, x, width) ** 2 * h;
  }
  return sum;
}

/** de Broglie wavelength λ = h / (m v). */
export function deBroglie(mass: number, speed: number): number {
  return H / (mass * speed);
}

export { HBAR, ELECTRON_MASS };
