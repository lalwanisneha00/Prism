import { z } from "zod";
import { isValidExpression } from "@/visuals/expression";
import { wave1Widgets } from "@/visuals/wave1/registry";
import { wave2Widgets } from "@/visuals/wave2/registry";

/*
 * Every interactive widget the AI may choose (SPEC §4). The AI returns
 * { "type": "widget", "widget": "<id>", "params": {...} }; params are checked against
 * these schemas before anything is drawn, and the list below is pasted into its prompt.
 */

const charge = z.object({
  q: z
    .number()
    .min(-3)
    .max(3)
    .refine((v) => v !== 0, "charge cannot be 0"),
  x: z.number().min(-3.5).max(3.5),
  y: z.number().min(-2.2).max(2.2),
});

/** An expression our safe parser accepts, in the given variables. */
const formula = (variables: string[]) =>
  z
    .string()
    .min(1)
    .max(120)
    .refine((s) => isValidExpression(s, variables), {
      message: `must be a valid expression in ${variables.join(", ")} (use * between variables)`,
    });

const range = z
  .tuple([z.number().min(-100).max(100), z.number().min(-100).max(100)])
  .refine(([lo, hi]) => lo < hi, { message: "range must be [min, max] with min < max" });

export const widgetRegistry = {
  "field-lines": {
    name: "Electric field lines",
    params: z.object({ charges: z.array(charge).min(1).max(4) }),
    help: 'charges: 1-4 of {q: -3..3 (not 0, relative units), x: -3.5..3.5, y: -2.2..2.2}. Example: {"charges":[{"q":1,"x":-1.5,"y":0},{"q":-1,"x":1.5,"y":0}]} for a dipole.',
    topics: [
      "coulombs-law",
      "electric-field",
      "electric-dipole",
      "electric-flux",
      "gauss-law",
      "equipotential-surfaces",
      "electric-potential",
    ],
  },
  "coulomb-force": {
    name: "Coulomb force between two charges",
    params: z.object({
      q1: z.number().min(-10).max(10),
      q2: z.number().min(-10).max(10),
      distance: z.number().min(0.05).max(1),
    }),
    help: "q1, q2 in microcoulombs (-10..10); distance in metres (0.05..1).",
    topics: ["coulombs-law", "electric-field"],
  },
  "gauss-surface": {
    name: "Gaussian surface around charges",
    params: z.object({
      charges: z.array(charge).min(1).max(5),
      radius: z.number().min(0.3).max(3.8),
    }),
    help: "charges as for field-lines (q in microcoulombs here); radius 0.3..3.8 of a circular surface centred at (0,0). Put some charges inside and one outside.",
    topics: ["gauss-law", "gauss-law-applications", "electric-flux"],
  },
  capacitor: {
    name: "Parallel-plate capacitor",
    params: z.object({
      areaCm2: z.number().min(10).max(500),
      gapMm: z.number().min(0.5).max(10),
      kappa: z.number().min(1).max(10),
      voltage: z.number().min(1).max(100),
    }),
    help: "areaCm2 10..500, gapMm 0.5..10, kappa 1..10 (1 = air), voltage 1..100.",
    topics: [
      "capacitors",
      "parallel-plate-capacitor",
      "capacitor-energy",
      "dielectrics",
      "capacitor-combinations",
    ],
  },
  "wire-field": {
    name: "Magnetic field around a straight wire",
    params: z.object({ current: z.number().min(0.5).max(50), direction: z.enum(["out", "in"]) }),
    help: 'current in amps (0.5..50); direction "out" of or "in" to the screen.',
    topics: ["biot-savart-law", "amperes-law", "force-on-wire", "lorentz-force", "magnetic-flux"],
  },
  "faraday-induction": {
    name: "Magnet moving through a coil",
    params: z.object({
      turns: z.number().int().min(10).max(500),
      speed: z.number().min(0.5).max(3),
    }),
    help: "turns 10..500 (integer); speed 0.5..3 (relative).",
    topics: [
      "emf-induction-machines",
      "magnetic-flux",
      "faradays-law",
      "lenzs-law",
      "motional-emf",
      "inductance",
      "eddy-currents",
      "ac-generator",
    ],
  },
  "dc-circuit": {
    name: "Series DC circuit",
    params: z.object({
      voltage: z.number().min(1).max(24),
      resistors: z.array(z.number().min(1).max(100)).min(1).max(3),
    }),
    help: "voltage 1..24 V; resistors: 1-3 values in ohms (1..100).",
    topics: [
      "current-drift-velocity",
      "ohms-law",
      "resistor-combinations",
      "kirchhoffs-laws",
      "electrical-power",
      "rc-circuits",
    ],
  },
  "ac-wave": {
    name: "AC voltage and current waves",
    params: z.object({
      amplitude: z.number().min(10).max(400),
      frequency: z.number().min(1).max(100),
      phaseDeg: z.number().min(-90).max(90),
      showCurrent: z.boolean(),
    }),
    help: "amplitude peak volts 10..400; frequency 1..100 Hz; phaseDeg -90..90 (negative = current lags, inductor; positive = leads, capacitor); showCurrent true/false.",
    topics: [
      "ac-rms",
      "phasors",
      "impedance",
      "lcr-resonance",
      "power-factor",
      "transformers",
      "ac-generator",
    ],
  },

  // ── Engineering Mathematics (V2 · Step 6) ──────────────────────────────────────────
  "function-explorer": {
    name: "Function with a parameter slider",
    params: z
      .object({
        expression: formula(["x", "a"]),
        aMin: z.number().min(-20).max(20),
        aMax: z.number().min(-20).max(20),
        aStart: z.number().min(-20).max(20),
        xRange: range,
      })
      .refine((p) => p.aMin < p.aMax && p.aStart >= p.aMin && p.aStart <= p.aMax, {
        message: "need aMin < aMax and aStart between them",
      }),
    help: 'expression in x and a (write products with *, e.g. "exp(-a*x)*sin(3*x)"); aMin, aMax, aStart (-20..20); xRange [min,max]. Shows how the constant a reshapes the curve.',
    topics: [
      "blackbody-radiation",
      "photoelectric-compton",
      "free-electron-fermi-level",
      "time-dilation-length-contraction",
      "relativistic-velocity-mass-energy",
      "ideal-gas-processes",
      "real-gases-critical",
      "rectilinear-motion",
      "hydrogen-wave-functions",
      "limits-continuity",
      "improper-integrals",
      "higher-order-linear-ode",
      "laplace-transform",
      "inverse-laplace",
      "power-series",
      "beta-gamma-functions",
      "legendre-polynomials",
    ],
  },
  "tangent-line": {
    name: "Tangent line and derivative",
    params: z
      .object({ expression: formula(["x"]), xRange: range, x0: z.number().min(-100).max(100) })
      .refine((p) => p.x0 >= p.xRange[0] && p.x0 <= p.xRange[1], {
        message: "x0 must lie inside xRange",
      }),
    help: 'expression in x, e.g. "x^3 - 3*x"; xRange [min,max]; x0 = starting point inside xRange. The student slides the point and reads the slope.',
    topics: [
      "derivatives-basics",
      "mean-value-theorems",
      "maxima-minima-one-variable",
      "lhopital-rule",
      "successive-differentiation",
      "limits-continuity",
    ],
  },
  "riemann-sum": {
    name: "Riemann sum (area by rectangles)",
    params: z
      .object({
        expression: formula(["x"]),
        a: z.number().min(-50).max(50),
        b: z.number().min(-50).max(50),
        n: z.int().min(1).max(50),
        method: z.enum(["left", "right", "midpoint"]),
      })
      .refine((p) => p.a < p.b, { message: "need a < b" }),
    help: 'expression in x; a < b are the limits; n rectangles (1..50, start small like 4); method "left" | "right" | "midpoint".',
    topics: [
      "work-energy-particles",
      "definite-integrals",
      "area-volume-integrals",
      "improper-integrals",
      "double-integrals",
    ],
  },
  "taylor-polynomial": {
    name: "Taylor / Maclaurin polynomial",
    params: z.object({
      fn: z.enum(["sin", "cos", "exp", "ln1p", "geometric"]),
      order: z.int().min(0).max(15),
    }),
    help: 'fn: "sin" | "cos" | "exp" | "ln1p" (ln(1+x)) | "geometric" (1/(1-x)); order 0..15 to start with (e.g. 3).',
    topics: ["taylor-maclaurin", "power-series", "convergence-tests", "successive-differentiation"],
  },
  "matrix-transform": {
    name: "2×2 matrix as a transformation (eigenvectors)",
    params: z.preprocess(
      // The AI often writes the matrix as rows; accept {"matrix": [[a, b], [c, d]]} too.
      (raw) => {
        const m = (raw as { matrix?: unknown } | null)?.matrix;
        if (
          Array.isArray(m) &&
          m.length === 2 &&
          m.every((r) => Array.isArray(r) && r.length === 2)
        ) {
          const [[a, b], [c, d]] = m as unknown[][];
          return { a, b, c, d };
        }
        return raw;
      },
      z.object({
        a: z.number().min(-3).max(3),
        b: z.number().min(-3).max(3),
        c: z.number().min(-3).max(3),
        d: z.number().min(-3).max(3),
      }),
    ),
    help: 'the matrix [[a, b], [c, d]] as {"a":2,"b":1,"c":1,"d":2}, each entry -3..3. Shows the transformed grid, unit square (area = det) and real eigenvector lines.',
    topics: [
      "eigenvalues-eigenvectors",
      "diagonalisation",
      "linear-transformations",
      "cayley-hamilton",
      "rank-of-matrix",
      "linear-systems",
      "jacobians",
      "orthogonal-transformations",
    ],
  },
  "vector-field": {
    name: "2D vector field with divergence and curl",
    params: z.object({
      p: formula(["x", "y"]),
      q: formula(["x", "y"]),
      range: z.number().min(1).max(10),
    }),
    help: 'F = (p, q), each an expression in x and y with * for products, e.g. p "-y", q "x" (rotation); range 1..10 (half-height of the view). The student taps to read div and curl.',
    topics: [
      "conservative-forces-potential",
      "gradient-divergence-curl",
      "directional-derivative",
      "line-integrals",
      "greens-theorem",
      "stokes-theorem",
      "divergence-theorem",
    ],
  },
  "slope-field": {
    name: "Slope field of a first-order ODE",
    params: z
      .object({
        f: formula(["x", "y"]),
        xRange: range,
        yRange: range,
        start: z.tuple([z.number(), z.number()]),
      })
      .refine(
        (p) =>
          p.start[0] >= p.xRange[0] &&
          p.start[0] <= p.xRange[1] &&
          p.start[1] >= p.yRange[0] &&
          p.start[1] <= p.yRange[1],
        { message: "start must lie inside xRange and yRange" },
      ),
    help: 'f = dy/dx as an expression in x and y (use *), e.g. "x - y"; xRange, yRange [min,max]; start [x0, y0] inside them (the initial condition).',
    topics: [
      "separable-ode",
      "exact-equations",
      "linear-first-order-ode",
      "bernoulli-equation",
      "clairaut-equation",
    ],
  },
  "fourier-series": {
    name: "Fourier series partial sums",
    params: z.object({
      wave: z.enum(["square", "sawtooth", "triangle"]),
      terms: z.int().min(1).max(40),
    }),
    help: 'wave: "square" | "sawtooth" (f(x) = x) | "triangle" (f(x) = |x|) on (-π, π); terms 1..40 to start with (e.g. 3).',
    topics: [
      "fourier-series-signals",
      "fourier-network-response",
      "fourier-series",
      "half-range-series",
      "convergence-tests",
      "parsevals-theorem",
    ],
  },
  ...wave1Widgets,
  ...wave2Widgets,
} as const;

export type WidgetId = keyof typeof widgetRegistry;

export function isWidgetId(id: string): id is WidgetId {
  return Object.hasOwn(widgetRegistry, id);
}

/** Checks a widget choice; returns a problem message, or null if it can be drawn. */
export function widgetProblem(widget: string, params: unknown): string | null {
  if (!isWidgetId(widget)) return `unknown widget "${widget}"`;
  const result = widgetRegistry[widget].params.safeParse(params);
  if (result.success) return null;
  const issue = result.error.issues[0];
  return `widget "${widget}" params: ${issue.path.join(".") || "(root)"} ${issue.message}`;
}

/** The widgets that suit a topic, best matches first. */
export function widgetsForTopic(topicId: string): WidgetId[] {
  return (Object.keys(widgetRegistry) as WidgetId[]).filter((id) =>
    (widgetRegistry[id].topics as readonly string[]).includes(topicId),
  );
}
