/*
 * Numerical maths behind the Engineering Mathematics widgets. The AI only picks a widget and
 * its parameters; every number on screen is computed here, by code we tested.
 */

export type RealFn = (x: number) => number;

/** f'(x) by a central difference: the slope of a tiny chord either side of x. */
export function derivative(f: RealFn, x: number, h = 1e-4): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

/** ∫ f dx over [a, b] by Simpson's rule (n is rounded up to an even number). */
export function simpson(f: RealFn, a: number, b: number, n = 1000): number {
  const steps = n % 2 === 0 ? n : n + 1;
  const h = (b - a) / steps;
  let sum = f(a) + f(b);
  for (let i = 1; i < steps; i++) sum += f(a + i * h) * (i % 2 === 0 ? 2 : 4);
  return (sum * h) / 3;
}

export type RiemannMethod = "left" | "right" | "midpoint";

/** The rectangles of a Riemann sum and their total area. */
export function riemannSum(f: RealFn, a: number, b: number, n: number, method: RiemannMethod) {
  const width = (b - a) / n;
  const offset = method === "left" ? 0 : method === "right" ? 1 : 0.5;
  const rects = Array.from({ length: n }, (_, i) => {
    const x = a + i * width;
    return { x, width, height: f(x + offset * width) };
  });
  return { rects, total: rects.reduce((s, r) => s + r.height * r.width, 0) };
}

export type TaylorFn = "sin" | "cos" | "exp" | "ln1p" | "geometric";

export const taylorFunctions: Record<TaylorFn, { label: string; f: RealFn; radius: number }> = {
  sin: { label: "sin x", f: Math.sin, radius: Infinity },
  cos: { label: "cos x", f: Math.cos, radius: Infinity },
  exp: { label: "eˣ", f: Math.exp, radius: Infinity },
  ln1p: { label: "ln(1 + x)", f: (x) => Math.log(1 + x), radius: 1 },
  geometric: { label: "1 / (1 − x)", f: (x) => 1 / (1 - x), radius: 1 },
};

const factorial = (k: number) => {
  let r = 1;
  for (let i = 2; i <= k; i++) r *= i;
  return r;
};

/** Maclaurin coefficients c₀ … cₙ, so f(x) ≈ Σ cₖ xᵏ. */
export function maclaurinCoefficients(fn: TaylorFn, order: number): number[] {
  return Array.from({ length: order + 1 }, (_, k) => {
    switch (fn) {
      case "sin":
        return k % 2 === 1 ? (-1) ** ((k - 1) / 2) / factorial(k) : 0;
      case "cos":
        return k % 2 === 0 ? (-1) ** (k / 2) / factorial(k) : 0;
      case "exp":
        return 1 / factorial(k);
      case "ln1p":
        return k === 0 ? 0 : (-1) ** (k + 1) / k;
      case "geometric":
        return 1;
    }
  });
}

export function evalPolynomial(coefficients: number[], x: number): number {
  return coefficients.reduceRight((acc, c) => acc * x + c, 0);
}

export type Wave = "square" | "sawtooth" | "triangle";

/** One period (−π, π) of each wave, and its Fourier partial sum with `terms` non-zero terms. */
export const waves: Record<
  Wave,
  { label: string; f: RealFn; partial: (x: number, terms: number) => number }
> = {
  square: {
    label: "Square wave",
    f: (x) => Math.sign(Math.sin(x)),
    partial: (x, terms) => {
      let s = 0;
      for (let i = 0; i < terms; i++) {
        const k = 2 * i + 1;
        s += Math.sin(k * x) / k;
      }
      return (4 / Math.PI) * s;
    },
  },
  sawtooth: {
    label: "Sawtooth f(x) = x",
    f: (x) => x - 2 * Math.PI * Math.round(x / (2 * Math.PI)),
    partial: (x, terms) => {
      let s = 0;
      for (let k = 1; k <= terms; k++) s += ((-1) ** (k + 1) * Math.sin(k * x)) / k;
      return 2 * s;
    },
  },
  triangle: {
    label: "Triangle f(x) = |x|",
    f: (x) => Math.abs(x - 2 * Math.PI * Math.round(x / (2 * Math.PI))),
    partial: (x, terms) => {
      let s = 0;
      for (let i = 0; i < terms; i++) {
        const k = 2 * i + 1;
        s += Math.cos(k * x) / (k * k);
      }
      return Math.PI / 2 - (4 / Math.PI) * s;
    },
  },
};

export type Eigen2 =
  | { kind: "real"; values: [number, number]; vectors: [[number, number], [number, number]] | null }
  | { kind: "complex"; re: number; im: number };

/** Eigenvalues (and unit eigenvectors when real) of [[a, b], [c, d]]. */
export function eigen2x2(a: number, b: number, c: number, d: number): Eigen2 {
  const trace = a + d;
  const det = a * d - b * c;
  const disc = trace * trace - 4 * det;
  if (disc < -1e-12) return { kind: "complex", re: trace / 2, im: Math.sqrt(-disc) / 2 };
  const root = Math.sqrt(Math.max(0, disc));
  const values: [number, number] = [(trace + root) / 2, (trace - root) / 2];
  const vectorFor = (l: number): [number, number] | null => {
    // (A − λI)v = 0: take a non-zero row and a vector perpendicular to it.
    const rows: [number, number][] = [
      [a - l, b],
      [c, d - l],
    ];
    const row = rows.find(([p, q]) => Math.hypot(p, q) > 1e-9);
    if (!row) return null; // A = λI: every vector is an eigenvector.
    const v: [number, number] = [-row[1], row[0]];
    const len = Math.hypot(v[0], v[1]);
    return [v[0] / len, v[1] / len];
  };
  const v1 = vectorFor(values[0]);
  const v2 = vectorFor(values[1]);
  return { kind: "real", values, vectors: v1 && v2 ? [v1, v2] : null };
}

/** Solves dy/dx = f(x, y) from (x0, y0) to xEnd with classical Runge–Kutta (RK4). */
export function solveOde(
  f: (x: number, y: number) => number,
  x0: number,
  y0: number,
  xEnd: number,
  steps = 200,
): { x: number; y: number }[] {
  const h = (xEnd - x0) / steps;
  const points = [{ x: x0, y: y0 }];
  let x = x0;
  let y = y0;
  for (let i = 0; i < steps; i++) {
    const k1 = f(x, y);
    const k2 = f(x + h / 2, y + (h / 2) * k1);
    const k3 = f(x + h / 2, y + (h / 2) * k2);
    const k4 = f(x + h, y + h * k3);
    y += (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
    x += h;
    if (!Number.isFinite(y)) break;
    points.push({ x, y });
  }
  return points;
}

/** Divergence and (scalar) curl of the plane field (P, Q) at a point, by central differences. */
export function divCurl(
  p: (x: number, y: number) => number,
  q: (x: number, y: number) => number,
  x: number,
  y: number,
  h = 1e-4,
) {
  const dPdx = (p(x + h, y) - p(x - h, y)) / (2 * h);
  const dPdy = (p(x, y + h) - p(x, y - h)) / (2 * h);
  const dQdx = (q(x + h, y) - q(x - h, y)) / (2 * h);
  const dQdy = (q(x, y + h) - q(x, y - h)) / (2 * h);
  return { divergence: dPdx + dQdy, curl: dQdx - dPdy };
}

/** A short, readable number for widget readouts. */
export function fmt(v: number, digits = 3): string {
  if (!Number.isFinite(v)) return "undefined";
  if (Math.abs(v) < 1e-10) return "0";
  if (Math.abs(v) >= 1e4 || Math.abs(v) < 1e-3) return v.toExponential(2);
  return String(Number(v.toPrecision(digits)));
}

/**
 * A y-range that shows the interesting part of some sampled values: the extreme 2% are
 * ignored so a spike (like 1/x near 0) doesn't flatten everything else.
 */
export function fitRange(values: number[], pad = 0.1): [number, number] {
  const ys = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (ys.length === 0) return [-1, 1];
  let lo = ys[Math.floor(ys.length * 0.02)];
  let hi = ys[Math.ceil(ys.length * 0.98) - 1];
  if (lo > 0 && lo < hi * 0.5) lo = 0;
  if (hi < 0 && hi > lo * 0.5) hi = 0;
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const margin = (hi - lo) * pad;
  // Rounded so the server and the browser (whose maths can differ in the last digit) agree.
  return [Number((lo - margin).toPrecision(4)), Number((hi + margin).toPrecision(4))];
}
