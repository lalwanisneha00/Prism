/* The statistics behind the stats explorers, computed in code (never by the AI). */

/** The error function (Abramowitz–Stegun 7.1.26, accurate to about 1.5e-7). */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return sign * y;
}

export function normalPdf(x: number, mean: number, sd: number): number {
  return Math.exp(-((x - mean) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));
}

export function normalCdf(x: number, mean: number, sd: number): number {
  return 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)));
}

/** Least-squares line y = slope·x + intercept and the correlation coefficient r. */
export function linearRegression(points: { x: number; y: number }[]) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    syy += (p.y - my) ** 2;
    sxy += (p.x - mx) * (p.y - my);
  }
  const slope = sxx === 0 ? 0 : sxy / sxx;
  return {
    slope,
    intercept: my - slope * mx,
    r: sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy),
  };
}

/** A small seeded random generator (mulberry32), so a demo is the same on every reload. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Population = "uniform" | "skewed" | "normal";

/** One value from a population on [0, 10] (mean 5 for uniform and normal). */
export function drawFrom(population: Population, random: () => number): number {
  if (population === "uniform") return random() * 10;
  if (population === "skewed") return Math.min(10, -Math.log(1 - random()) * 2); // exponential, mean 2
  // Box–Muller, mean 5, sd 1.5, clipped to [0, 10].
  const z = Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
  return Math.min(10, Math.max(0, 5 + 1.5 * z));
}

/** The means of `count` samples of size n: the central limit theorem in action. */
export function sampleMeans(
  population: Population,
  n: number,
  count: number,
  random: () => number,
): number[] {
  return Array.from({ length: count }, () => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += drawFrom(population, random);
    return sum / n;
  });
}

/** Counts values into equal-width bins over [lo, hi]. */
export function histogram(values: number[], lo: number, hi: number, bins: number): number[] {
  const counts = new Array<number>(bins).fill(0);
  for (const v of values) {
    const i = Math.min(bins - 1, Math.max(0, Math.floor(((v - lo) / (hi - lo)) * bins)));
    counts[i]++;
  }
  return counts;
}

export function meanAndSd(values: number[]): { mean: number; sd: number } {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, values.length - 1);
  return { mean, sd: Math.sqrt(variance) };
}
