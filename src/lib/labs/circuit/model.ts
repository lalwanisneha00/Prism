import { z } from "zod";

/*
 * A lab circuit as data (syllabus fix, Phase 7C). The AI never draws a circuit: it lists the
 * components and the wires (terminal to terminal), and Prism checks, solves and draws it.
 * Terminal names are fixed per component type, so polarity (+/-, anode/cathode) is always marked.
 */

export const COMPONENT_TYPES = [
  "battery",
  "dc-supply",
  "ac-supply",
  "function-generator",
  "solar-cell",
  "resistor",
  "rheostat",
  "potentiometer",
  "bulb",
  "capacitor",
  "electrolytic-capacitor",
  "inductor",
  "diode",
  "led",
  "zener",
  "photodiode",
  "ammeter",
  "voltmeter",
  "galvanometer",
  "oscilloscope",
  "switch",
  "fuse",
  "motor",
  "transistor-npn",
  "transistor-pnp",
  "transformer",
  "ic",
  "microcontroller",
  "sensor",
  "module",
] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

/** Fixed terminals; `null` = the AI lists the pins (ICs, boards, sensors, modules). */
export const TERMINALS: Record<ComponentType, readonly string[] | null> = {
  battery: ["+", "-"],
  "dc-supply": ["+", "-"],
  "ac-supply": ["1", "2"],
  "function-generator": ["+", "-"],
  "solar-cell": ["+", "-"],
  resistor: ["1", "2"],
  rheostat: ["1", "2"],
  potentiometer: ["1", "2", "wiper"],
  bulb: ["1", "2"],
  capacitor: ["1", "2"],
  "electrolytic-capacitor": ["+", "-"],
  inductor: ["1", "2"],
  diode: ["anode", "cathode"],
  led: ["anode", "cathode"],
  zener: ["anode", "cathode"],
  photodiode: ["anode", "cathode"],
  ammeter: ["+", "-"],
  voltmeter: ["+", "-"],
  galvanometer: ["+", "-"],
  oscilloscope: ["+", "-"],
  switch: ["1", "2"],
  fuse: ["1", "2"],
  motor: ["+", "-"],
  "transistor-npn": ["c", "b", "e"],
  "transistor-pnp": ["c", "b", "e"],
  transformer: ["p1", "p2", "s1", "s2"],
  ic: null,
  microcontroller: null,
  sensor: null,
  module: null,
};

/** What each value means, for labels and the prompt. */
export const VALUE_UNIT: Partial<Record<ComponentType, string>> = {
  battery: "V",
  "dc-supply": "V",
  "ac-supply": "V",
  "function-generator": "V",
  "solar-cell": "A",
  resistor: "Ω",
  rheostat: "Ω",
  potentiometer: "Ω",
  bulb: "Ω",
  capacitor: "F",
  "electrolytic-capacitor": "F",
  inductor: "H",
  zener: "V",
  fuse: "A",
};

export const SOURCE_TYPES: ReadonlySet<ComponentType> = new Set([
  "battery",
  "dc-supply",
  "ac-supply",
  "function-generator",
  "solar-cell",
]);
export const METER_TYPES: ReadonlySet<ComponentType> = new Set([
  "ammeter",
  "voltmeter",
  "galvanometer",
  "oscilloscope",
]);

const compId = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]{0,15}$/, "component ids look like R1, V1, BAT, LED1");
const terminalRef = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9_]{0,15}\.[A-Za-z0-9+_-]{1,12}$/, 'terminals look like "R1.1"');

export const CircuitComponentSchema = z.object({
  id: compId,
  type: z.enum(COMPONENT_TYPES),
  label: z
    .string()
    .trim()
    .min(1)
    .transform((s) => (s.length > 40 ? `${s.slice(0, 39).trimEnd()}…` : s)),
  /** In SI base units: volts (sources: RMS for AC), ohms, farads, henries, amperes. */
  value: z.number().positive().max(1e9).optional(),
  /** AC sources: hertz. */
  frequency: z.number().positive().max(1e7).optional(),
  /** A slider for this value on the interactive circuit. */
  adjust: z
    .object({ min: z.number().min(0), max: z.number().positive() })
    .refine((a) => a.min < a.max, "adjust.min must be below adjust.max")
    .optional(),
  /** Pin names, only for ic / microcontroller / sensor / module, e.g. ["D13", "GND"]. */
  pins: z
    .array(z.string().regex(/^[A-Za-z0-9+_-]{1,12}$/))
    .min(1)
    .max(16)
    .optional(),
});

export const CircuitSchema = z.object({
  components: z.array(CircuitComponentSchema).min(2).max(16),
  /** Each wire, terminal to terminal, in the order a student would connect them. */
  connections: z
    .array(z.object({ from: terminalRef, to: terminalRef }))
    .min(2)
    .max(30),
  /** Step-by-step wiring: each step names the wires (indexes into connections) it adds. */
  wiring: z
    .array(
      z.object({ text: z.string().trim().min(1).max(300), connections: z.array(z.int().min(0)) }),
    )
    .min(1)
    .max(20),
  /** A live graph: sweep one component's value and plot meter y against meter x. */
  plot: z
    .object({
      sweep: compId,
      /** What is swept: the component's value (default) or an AC source's frequency. */
      param: z.enum(["value", "frequency"]).optional(),
      x: compId,
      y: compId,
      xLabel: z.string().trim().min(1).max(40),
      yLabel: z.string().trim().min(1).max(40),
    })
    .optional(),
});

export type CircuitComponent = z.infer<typeof CircuitComponentSchema>;
export type Circuit = z.infer<typeof CircuitSchema>;

/** The terminal names of one component. */
export function terminalsOf(c: CircuitComponent): readonly string[] {
  return TERMINALS[c.type] ?? c.pins ?? [];
}

export function splitRef(ref: string): { comp: string; terminal: string } {
  const dot = ref.indexOf(".");
  return { comp: ref.slice(0, dot), terminal: ref.slice(dot + 1) };
}

const PREFIXES: [number, string][] = [
  [1e9, "G"],
  [1e6, "M"],
  [1e3, "k"],
  [1, ""],
  [1e-3, "m"],
  [1e-6, "µ"],
  [1e-9, "n"],
  [1e-12, "p"],
];

/** 4700 → "4.7 kΩ"; 0.0012 → "1.2 mA". */
export function formatSI(value: number, unit: string, digits = 3): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return `0 ${unit}`;
  const abs = Math.abs(value);
  const [scale, prefix] =
    PREFIXES.find(([s]) => abs >= s * 0.9995) ?? PREFIXES[PREFIXES.length - 1];
  const n = value / scale;
  return `${Number(n.toPrecision(digits))} ${prefix}${unit}`;
}
