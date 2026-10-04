/*
 * Models behind the Engineering Mechanics, Graphics, Programming, Environmental Science and
 * complex-variable widgets (V3 · Step 7). Pure and tested (otherModels.test.ts).
 */

// ---------------------------------------------------------------- engineering mechanics

export type Force = { magnitude: number; angleDeg: number };

/** Resultant of concurrent coplanar forces: ΣFx, ΣFy, magnitude and direction. */
export function resultant(forces: Force[]) {
  let fx = 0;
  let fy = 0;
  for (const f of forces) {
    const a = (f.angleDeg * Math.PI) / 180;
    fx += f.magnitude * Math.cos(a);
    fy += f.magnitude * Math.sin(a);
  }
  const magnitude = Math.hypot(fx, fy);
  const angleDeg = magnitude < 1e-9 ? 0 : (Math.atan2(fy, fx) * 180) / Math.PI;
  return { fx, fy, magnitude, angleDeg };
}

/** A block on an incline: does it slide, and with what acceleration (m/s²)? */
export function incline(angleDeg: number, muStatic: number, muKinetic: number, g = 9.81) {
  const a = (angleDeg * Math.PI) / 180;
  const down = g * Math.sin(a);
  const normal = g * Math.cos(a);
  const slides = Math.tan(a) > muStatic;
  const acceleration = slides ? down - muKinetic * normal : 0;
  const angleOfRepose = (Math.atan(muStatic) * 180) / Math.PI;
  return {
    slides,
    acceleration,
    angleOfRepose,
    frictionNeeded: down,
    frictionAvailable: muStatic * normal,
  };
}

/** Projectile launched from the ground: time of flight, range, maximum height, position at t. */
export function projectile(speed: number, angleDeg: number, g = 9.81) {
  const a = (angleDeg * Math.PI) / 180;
  const vx = speed * Math.cos(a);
  const vy = speed * Math.sin(a);
  const flight = (2 * vy) / g;
  return {
    vx,
    vy,
    flight,
    range: vx * flight,
    maxHeight: (vy * vy) / (2 * g),
    at: (t: number) => ({ x: vx * t, y: vy * t - 0.5 * g * t * t }),
  };
}

// ---------------------------------------------------------------- engineering graphics

/** Points of a conic drawn by the eccentricity (focus–directrix) method, focus at origin. */
export function conicPoints(e: number, focusToDirectrix: number, samples = 360) {
  // r(θ) = e d / (1 − e cos θ): directrix at x = −d, so PF = e · (x + d).
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const th = (2 * Math.PI * i) / samples;
    const den = 1 - e * Math.cos(th);
    if (den <= 1e-3) continue;
    const r = (e * focusToDirectrix) / den;
    pts.push({ x: r * Math.cos(th), y: r * Math.sin(th) });
  }
  return pts;
}

export function conicName(e: number): "circle" | "ellipse" | "parabola" | "hyperbola" {
  if (e === 0) return "circle";
  if (e < 1) return "ellipse";
  if (Math.abs(e - 1) < 1e-9) return "parabola";
  return "hyperbola";
}

export type Roulette = "cycloid" | "epicycloid" | "hypocycloid" | "involute";

/** The traced point after the rolling circle (radius r) has turned by θ. */
export function roulette(kind: Roulette, theta: number, r: number, baseR: number) {
  switch (kind) {
    case "cycloid":
      return { x: r * (theta - Math.sin(theta)), y: r * (1 - Math.cos(theta)) };
    case "epicycloid": {
      const k = (baseR + r) / r;
      return {
        x: (baseR + r) * Math.cos(theta) - r * Math.cos(k * theta),
        y: (baseR + r) * Math.sin(theta) - r * Math.sin(k * theta),
      };
    }
    case "hypocycloid": {
      const k = (baseR - r) / r;
      return {
        x: (baseR - r) * Math.cos(theta) + r * Math.cos(k * theta),
        y: (baseR - r) * Math.sin(theta) - r * Math.sin(k * theta),
      };
    }
    case "involute":
      return {
        x: baseR * (Math.cos(theta) + theta * Math.sin(theta)),
        y: baseR * (Math.sin(theta) - theta * Math.cos(theta)),
      };
  }
}

export type Solid = "prism" | "pyramid" | "cylinder" | "cone";

/**
 * First-angle orthographic views of a right regular solid standing on its base on the HP
 * (square prism/pyramid; axis vertical): the front view (elevation) and top view (plan) as
 * outline shapes, in units of the base side (or diameter) and height.
 */
export function solidViews(solid: Solid, base: number, height: number) {
  const half = base / 2;
  const rect = (w: number, h: number) => [
    { x: -w / 2, y: 0 },
    { x: w / 2, y: 0 },
    { x: w / 2, y: h },
    { x: -w / 2, y: h },
  ];
  const tri = (w: number, h: number) => [
    { x: -w / 2, y: 0 },
    { x: w / 2, y: 0 },
    { x: 0, y: h },
  ];
  const front = solid === "prism" || solid === "cylinder" ? rect(base, height) : tri(base, height);
  const top =
    solid === "prism" || solid === "pyramid"
      ? { shape: "square" as const, half, apex: solid === "pyramid" }
      : { shape: "circle" as const, half, apex: solid === "cone" };
  return { front, top };
}

// ---------------------------------------------------------------- programming

export type SortAlgo = "bubble" | "insertion" | "selection";
export type SortStep = {
  array: number[];
  compare: [number, number] | null;
  sortedFrom: number;
  note: string;
};

/** Every comparison and swap of a simple sort, for stepping through. */
export function sortSteps(algo: SortAlgo, input: number[]): SortStep[] {
  const a = [...input];
  const steps: SortStep[] = [{ array: [...a], compare: null, sortedFrom: a.length, note: "Start" }];
  const n = a.length;
  if (algo === "bubble") {
    for (let pass = 0; pass < n - 1; pass++) {
      for (let j = 0; j < n - 1 - pass; j++) {
        const swap = a[j] > a[j + 1];
        if (swap) [a[j], a[j + 1]] = [a[j + 1], a[j]];
        steps.push({
          array: [...a],
          compare: [j, j + 1],
          sortedFrom: n - pass,
          note: swap ? `${a[j + 1]} > ${a[j]}: swap` : `${a[j]} ≤ ${a[j + 1]}: keep`,
        });
      }
    }
  } else if (algo === "insertion") {
    for (let i = 1; i < n; i++) {
      let j = i;
      while (j > 0 && a[j - 1] > a[j]) {
        [a[j - 1], a[j]] = [a[j], a[j - 1]];
        steps.push({
          array: [...a],
          compare: [j - 1, j],
          sortedFrom: n,
          note: `Move ${a[j - 1]} left`,
        });
        j--;
      }
      steps.push({
        array: [...a],
        compare: null,
        sortedFrom: n,
        note: `First ${i + 1} items are in order`,
      });
    }
  } else {
    for (let i = 0; i < n - 1; i++) {
      let min = i;
      for (let j = i + 1; j < n; j++) {
        if (a[j] < a[min]) min = j;
        steps.push({
          array: [...a],
          compare: [min, j],
          sortedFrom: n,
          note: `Smallest so far: ${a[min]}`,
        });
      }
      [a[i], a[min]] = [a[min], a[i]];
      steps.push({
        array: [...a],
        compare: null,
        sortedFrom: n,
        note: `Put ${a[i]} in place ${i + 1}`,
      });
    }
  }
  steps.push({ array: [...a], compare: null, sortedFrom: 0, note: "Sorted" });
  return steps;
}

export type SearchStep = { low: number; high: number; mid: number; note: string; found: boolean };

/** Binary search on a sorted array, step by step. */
export function binarySearchSteps(sorted: number[], target: number): SearchStep[] {
  const steps: SearchStep[] = [];
  let low = 0;
  let high = sorted.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (sorted[mid] === target) {
      steps.push({ low, high, mid, note: `a[${mid}] = ${target}: found`, found: true });
      return steps;
    }
    const goRight = sorted[mid] < target;
    steps.push({
      low,
      high,
      mid,
      note: `a[${mid}] = ${sorted[mid]} ${goRight ? "<" : ">"} ${target}: search the ${goRight ? "right" : "left"} half`,
      found: false,
    });
    if (goRight) low = mid + 1;
    else high = mid - 1;
  }
  steps.push({ low, high, mid: -1, note: `${target} is not in the array`, found: false });
  return steps;
}

export type CallNode = { label: string; value: number; children: CallNode[] };

/** The call tree of a recursive function (factorial or Fibonacci). */
export function callTree(fn: "factorial" | "fibonacci", n: number): CallNode {
  if (fn === "factorial") {
    if (n <= 1) return { label: `fact(${n})`, value: 1, children: [] };
    const child = callTree("factorial", n - 1);
    return { label: `fact(${n})`, value: n * child.value, children: [child] };
  }
  if (n <= 1) return { label: `fib(${n})`, value: n, children: [] };
  const a = callTree("fibonacci", n - 1);
  const b = callTree("fibonacci", n - 2);
  return { label: `fib(${n})`, value: a.value + b.value, children: [a, b] };
}

export function countCalls(node: CallNode): number {
  return 1 + node.children.reduce((s, c) => s + countCalls(c), 0);
}

// ---------------------------------------------------------------- environmental science

/** Energy at each trophic level with a transfer efficiency (the "10% rule"). */
export function energyPyramid(
  producerEnergy: number,
  efficiency: number,
  levels: number,
): number[] {
  return Array.from({ length: levels }, (_, i) => producerEnergy * efficiency ** i);
}

/** Exponential and logistic population growth. */
export function exponentialGrowth(n0: number, r: number, t: number): number {
  return n0 * Math.exp(r * t);
}

export function logisticGrowth(n0: number, r: number, k: number, t: number): number {
  return k / (1 + ((k - n0) / n0) * Math.exp(-r * t));
}

/**
 * Rainwater that can be harvested from a roof or catchment: V = A × R × C, with area A (m²),
 * rainfall R (mm → m) and runoff coefficient C (≈ 0.8–0.9 for a tiled or concrete roof).
 * Returned in litres.
 */
export function rainwaterLitres(areaM2: number, rainfallMm: number, runoff: number): number {
  return areaM2 * (rainfallMm / 1000) * runoff * 1000;
}

export function doublingTime(r: number): number {
  return Math.log(2) / r;
}

// ---------------------------------------------------------------- complex variables

export type Complex = { re: number; im: number };
export type ComplexMap = "z^2" | "exp(z)" | "1/z" | "mobius" | "sin(z)";

/** Apply a complex map w = f(z). The Möbius map is (z − 1)/(z + 1). */
export function applyMap(map: ComplexMap, z: Complex): Complex {
  const { re: x, im: y } = z;
  switch (map) {
    case "z^2":
      return { re: x * x - y * y, im: 2 * x * y };
    case "exp(z)":
      return { re: Math.exp(x) * Math.cos(y), im: Math.exp(x) * Math.sin(y) };
    case "1/z": {
      const d = x * x + y * y;
      return d === 0 ? { re: Infinity, im: Infinity } : { re: x / d, im: -y / d };
    }
    case "mobius": {
      const d = (x + 1) ** 2 + y * y;
      return d === 0
        ? { re: Infinity, im: Infinity }
        : { re: ((x - 1) * (x + 1) + y * y) / d, im: (y * (x + 1) - (x - 1) * y) / d };
    }
    case "sin(z)":
      return { re: Math.sin(x) * Math.cosh(y), im: Math.cos(x) * Math.sinh(y) };
  }
}

/** The Cauchy–Riemann check: u_x = v_y and u_y = −v_x at a point (numerically). */
export function cauchyRiemann(map: ComplexMap, z: Complex, h = 1e-5) {
  const f = (x: number, y: number) => applyMap(map, { re: x, im: y });
  const fx1 = f(z.re + h, z.im);
  const fx0 = f(z.re - h, z.im);
  const fy1 = f(z.re, z.im + h);
  const fy0 = f(z.re, z.im - h);
  const ux = (fx1.re - fx0.re) / (2 * h);
  const vx = (fx1.im - fx0.im) / (2 * h);
  const uy = (fy1.re - fy0.re) / (2 * h);
  const vy = (fy1.im - fy0.im) / (2 * h);
  return { ux, uy, vx, vy, holds: Math.abs(ux - vy) < 1e-4 && Math.abs(uy + vx) < 1e-4 };
}

export type Pole = { re: number; im: number; residue: Complex };

/** Winding number of a circle (centre c, radius r) around a point: 1 inside, 0 outside. */
export function windingNumber(cRe: number, cIm: number, r: number, p: { re: number; im: number }) {
  return Math.hypot(p.re - cRe, p.im - cIm) < r ? 1 : 0;
}

/** Residue theorem: ∮ f dz = 2πi Σ residues of the poles inside the contour. */
export function contourIntegral(cRe: number, cIm: number, r: number, poles: Pole[]): Complex {
  let re = 0;
  let im = 0;
  for (const p of poles) {
    if (windingNumber(cRe, cIm, r, p)) {
      re += p.residue.re;
      im += p.residue.im;
    }
  }
  // 2πi (re + i im) = −2π im + 2π i re
  return { re: -2 * Math.PI * im, im: 2 * Math.PI * re };
}
