import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import { Container } from "@/components/Container";
import { VisualSlot } from "@/components/lesson/VisualSlot";
import type { VisualSpec } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Visual gallery (dev)",
  robots: { index: false },
};

/** Every visual the AI can choose, with example settings, for checking by eye. */
const gallery: VisualSpec[] = [
  {
    type: "widget",
    widget: "field-lines",
    params: {
      charges: [
        { q: 1, x: -1.5, y: 0 },
        { q: -1, x: 1.5, y: 0 },
      ],
    },
    caption: "An electric dipole. Drag either charge.",
  },
  {
    type: "widget",
    widget: "coulomb-force",
    params: { q1: 2, q2: -3, distance: 0.3 },
    caption: "Opposite charges attract; the force falls with the square of the distance.",
  },
  {
    type: "widget",
    widget: "gauss-surface",
    params: {
      charges: [
        { q: 2, x: -0.5, y: 0.3 },
        { q: -1, x: 0.6, y: -0.4 },
        { q: 3, x: 3, y: 1.5 },
      ],
      radius: 1.5,
    },
    caption: "Only the charge inside the surface sets the net flux.",
  },
  {
    type: "widget",
    widget: "capacitor",
    params: { areaCm2: 100, gapMm: 1, kappa: 1, voltage: 12 },
    caption: "A 100 cm² air capacitor charged to 12 V.",
  },
  {
    type: "widget",
    widget: "wire-field",
    params: { current: 10, direction: "out" },
    caption: "Field circles around a wire: right-hand rule.",
  },
  {
    type: "widget",
    widget: "faraday-induction",
    params: { turns: 100, speed: 1 },
    caption: "Flux rises then falls, so the EMF changes sign.",
  },
  {
    type: "widget",
    widget: "dc-circuit",
    params: { voltage: 12, resistors: [2, 4] },
    caption: "12 V across 2 Ω and 4 Ω in series.",
  },
  {
    type: "widget",
    widget: "ac-wave",
    params: { amplitude: 325, frequency: 50, phaseDeg: -90, showCurrent: true },
    caption: "230 V mains: current lags by 90° in a pure inductor.",
  },
  {
    type: "plot",
    expression: "1/x^2",
    xRange: [0.3, 3],
    xLabel: "distance r",
    yLabel: "field E (relative)",
    caption: "The inverse-square law.",
  },
  {
    type: "mermaid",
    code: "flowchart LR\n  A[Changing flux] --> B[Induced EMF]\n  B --> C[Induced current]\n  C --> D[Opposes the change]",
    caption: "Lenz's law as a chain of cause and effect.",
  },
  { type: "phet", sim: "faradays-law", caption: "PhET: move the magnet and watch the bulb." },
  {
    type: "image",
    file: "File:VFPt charges plus minus thumb.svg",
    alt: "Field lines between a positive and a negative charge",
    caption: "Field lines of a dipole (a real image from Wikimedia Commons).",
  },
  // Engineering Mathematics (V2 · Step 6)
  {
    type: "widget",
    widget: "function-explorer",
    params: { expression: "exp(-a*x)*sin(3*x)", aMin: 0, aMax: 2, aStart: 0.3, xRange: [0, 10] },
    caption: "Damped oscillation: a larger a makes it die out faster.",
  },
  {
    type: "widget",
    widget: "tangent-line",
    params: { expression: "x^3 - 3*x", xRange: [-2.5, 2.5], x0: 0.5 },
    caption: "The tangent is flat at x = ±1: the local maximum and minimum.",
  },
  {
    type: "widget",
    widget: "riemann-sum",
    params: { expression: "x^2", a: 0, b: 2, n: 4, method: "left" },
    caption: "Left rectangles underestimate a rising curve; more rectangles close the gap.",
  },
  {
    type: "widget",
    widget: "taylor-polynomial",
    params: { fn: "sin", order: 3 },
    caption: "x − x³/6 already matches sin x near 0.",
  },
  {
    type: "widget",
    widget: "matrix-transform",
    params: { a: 2, b: 1, c: 1, d: 2 },
    caption: "This symmetric matrix stretches along y = x by 3 and along y = −x by 1.",
  },
  {
    type: "widget",
    widget: "vector-field",
    params: { p: "-y", q: "x", range: 3 },
    caption: "A pure rotation: zero divergence, curl 2 everywhere.",
  },
  {
    type: "widget",
    widget: "slope-field",
    params: { f: "x - y", xRange: [-3, 3], yRange: [-3, 3], start: [-2, 1] },
    caption: "Every solution of y′ = x − y approaches the line y = x − 1.",
  },
  {
    type: "widget",
    widget: "fourier-series",
    params: { wave: "square", terms: 3 },
    caption: "Odd sine harmonics build a square wave; note the overshoot at each jump.",
  },
  {
    type: "derivation",
    steps: [
      { math: String.raw`\frac{dy}{dx} + P(x)\,y = Q(x)`, why: "A linear first-order equation." },
      {
        math: String.raw`\mu(x) = e^{\int P(x)\,dx}`,
        why: "Choose the integrating factor $\mu$ so that $\mu' = P\mu$.",
      },
      {
        math: String.raw`\frac{d}{dx}\left(\mu y\right) = \mu Q`,
        why: "Multiplying by $\mu$ turns the left side into a product rule.",
      },
      {
        math: String.raw`y = \frac{1}{\mu}\left(\int \mu Q\,dx + C\right)`,
        why: "Integrate both sides and divide by $\mu$.",
      },
    ],
    caption: "Solving a linear first-order ODE with an integrating factor.",
  },
];

export default function VisualGalleryPage() {
  return (
    <Container className="flex flex-col gap-8 py-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visual gallery</h1>
        <p className="mt-2 text-muted">
          Developer page: every visual type the lesson AI may choose, with example settings.
        </p>
      </div>
      {gallery.map((visual, i) => (
        <section key={i} aria-label={visual.caption}>
          <VisualSlot visual={visual} />
        </section>
      ))}
    </Container>
  );
}
