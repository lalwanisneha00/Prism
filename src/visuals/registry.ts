import { z } from "zod";

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
