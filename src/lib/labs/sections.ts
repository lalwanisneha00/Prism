import { z } from "zod";
import { APPARATUS_ICONS } from "@/lib/labs/apparatusIcons";
import { CircuitSchema } from "@/lib/labs/circuit/model";
import { DrawingSchema } from "@/lib/labs/drawing";
import { LabSimulationSchema } from "@/lib/labs/practicalSchema";

/*
 * The building blocks of a lab lesson (syllabus fix, Phase 7C). Each archetype in
 * src/data/labs/archetypes.json is an ordered list of sections; each section has one of these
 * kinds, which fixes what the AI writes for it (schema + shape in the prompt), which markdown the
 * app checks, and how it is drawn (src/components/labs/LabSection.tsx).
 */

const text = z.string().trim().min(1);
const short = (max: number) => z.string().trim().min(1).max(max);
/** Display text that is only too long: shortened by the app instead of sent back to the AI. */
const clip = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .transform((s) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s));
const partId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "part ids are lowercase-kebab-case");

export const LANGUAGES = [
  "c",
  "cpp",
  "java",
  "python",
  "javascript",
  "sql",
  "shell",
  "matlab",
  "arduino",
  "verilog",
  "html",
  "other",
] as const;
export type CodeLanguage = (typeof LANGUAGES)[number];

export const SetupSchema = z.object({
  parts: z
    .array(
      z.object({
        id: partId,
        label: clip(40),
        icon: z.enum(APPARATUS_ICONS).optional(),
        role: clip(160).optional(),
      }),
    )
    .min(2)
    .max(12),
  links: z
    .array(
      z.object({
        from: partId,
        to: partId,
        label: clip(30).optional(),
        kind: z.enum(["wire", "tube", "light", "mechanical", "flow"]).optional(),
      }),
    )
    .max(16),
  notes: text.optional(),
});

export const CodeExampleSchema = z.object({
  title: clip(80),
  language: z.enum(LANGUAGES),
  code: z
    .string()
    .min(1)
    .max(4000)
    .refine((s) => s.split("\n").length <= 70, "keep each example under 70 lines"),
  explanation: z
    .array(
      z.object({ lines: z.string().regex(/^\d+(-\d+)?$/, 'lines look like "3" or "3-5"'), text }),
    )
    .min(1)
    .max(20),
  /** What the program reads, if anything (typed into the Run box). */
  input: z.string().max(500).optional(),
  output: z.string().max(2000),
});

export const TraceSchema = z.object({
  /** Which code example (0-based) this dry run follows. */
  example: z.int().min(0),
  steps: z
    .array(
      z.object({
        line: z.int().min(1),
        note: clip(200),
        vars: z.array(z.object({ name: short(30), value: z.string().max(60) })).max(12),
        output: z.string().max(200).optional(),
        /** Boxes and arrows for pointers, arrays or linked structures. */
        memory: z
          .array(
            z.object({
              name: short(30),
              value: z.string().max(40),
              address: z.string().max(16).optional(),
              pointsTo: short(30).optional(),
            }),
          )
          .max(10)
          .optional(),
      }),
    )
    .min(3)
    .max(30),
});

/** Every kind: its schema, the JSON shape shown to the AI, and its rule. */
export const SECTION_KINDS = {
  text: {
    schema: text,
    shape: '"markdown text"',
    rule: "markdown, $maths$ allowed",
  },
  theory: {
    schema: z.object({
      body: text,
      formulas: z.array(z.object({ latex: text, meaning: clip(200) })).max(8),
    }),
    shape:
      '{ "body": "markdown with $maths$", "formulas": [{ "latex": "V = IR", "meaning": "..." }] }',
    rule: "the principle and why the method works; key formulas or reaction equations in KaTeX (chemistry: e.g. \\\\mathrm{HCl + NaOH \\\\rightarrow NaCl + H_2O})",
  },
  list: {
    schema: z.array(text).min(1).max(25),
    shape: '["...", "..."]',
    rule: "short items, markdown allowed",
  },
  steps: {
    schema: z
      .array(z.object({ text, parts: z.array(partId).max(6).default([]) }))
      .min(2)
      .max(20),
    shape: '[{ "text": "...", "parts": ["part-id"] }]',
    rule: 'numbered steps; "parts" = ids of the diagram parts this step uses (may be empty)',
  },
  setup: {
    schema: SetupSchema,
    shape: `{ "parts": [{ "id": "burette", "label": "Burette (50 mL)", "icon": "burette", "role": "delivers the titrant" }], "links": [{ "from": "burette", "to": "flask", "label": "drops", "kind": "flow" }], "notes": "optional markdown" }`,
    rule: `a labelled diagram: 2 to 12 parts (kebab-case ids) with an "icon" from: ${APPARATUS_ICONS.join(", ")} (omit icon if none fits); links join parts that touch or connect (kind: wire, tube, light, mechanical, flow)`,
  },
  circuit: {
    schema: CircuitSchema.extend({ fallback: z.boolean().optional() }),
    shape: `{
      "components": [{ "id": "B1", "type": "dc-supply", "label": "DC supply", "value": 5, "adjust": { "min": 0, "max": 10 } }, { "id": "A1", "type": "ammeter", "label": "Ammeter (0-100 mA)" }, { "id": "R1", "type": "resistor", "label": "Resistor", "value": 100 }, { "id": "V1", "type": "voltmeter", "label": "Voltmeter (0-10 V)" }],
      "connections": [{ "from": "B1.+", "to": "A1.+" }, { "from": "A1.-", "to": "R1.1" }, { "from": "R1.2", "to": "B1.-" }, { "from": "V1.+", "to": "R1.1" }, { "from": "V1.-", "to": "R1.2" }],
      "wiring": [{ "text": "Connect the + terminal of the supply to the + terminal of the ammeter.", "connections": [0] }, { "text": "...", "connections": [1, 2] }, { "text": "Connect the voltmeter across the resistor, + to the side nearer the supply's +.", "connections": [3, 4] }],
      "plot": { "sweep": "B1", "x": "V1", "y": "A1", "xLabel": "Voltage V (V)", "yLabel": "Current I (A)" }
    }`,
    rule: `the real lab circuit as data, never a picture. Component types and their terminals: battery/dc-supply/function-generator/solar-cell/electrolytic-capacitor/ammeter/voltmeter/galvanometer/oscilloscope/motor "+","-"; ac-supply/resistor/rheostat/bulb/capacitor/inductor/switch/fuse "1","2"; potentiometer "1","2","wiper"; diode/led/zener/photodiode "anode","cathode"; transistor-npn/pnp "c","b","e"; transformer "p1","p2","s1","s2"; ic/microcontroller/sensor/module list their "pins" (e.g. ["5V","GND","D9"]). "value" in SI base units (V, Ω, F, H; AC sources RMS volts plus "frequency" in Hz; solar-cell = its short-circuit current in A; zener = Vz). "adjust" gives a slider range for values a student changes in the lab. Every terminal is wired; an ammeter in series, a voltmeter across the part it measures, + towards the supply's +. "wiring" adds every connection exactly once, in bench order. "plot" (optional) sweeps one value and plots meter y against meter x (or the swept value itself; "param": "frequency" sweeps an AC source's frequency)`,
  },
  wiring: {
    schema: z.null(),
    shape: "",
    rule: "",
  },
  observations: {
    schema: z
      .object({
        columns: z.array(clip(40)).min(2).max(8),
        /** Blank rows to copy; 3 to 15 (outside that range it is moved in, not refused). */
        blankRows: z.preprocess(
          (v) => (typeof v === "number" ? Math.min(15, Math.max(3, Math.round(v))) : v),
          z.int().min(3).max(15),
        ),
        sampleRows: z
          .array(z.array(clip(30)))
          .min(2)
          .max(12),
      })
      .refine((t) => t.sampleRows.every((r) => r.length === t.columns.length), {
        message: "every sample row needs one cell per column",
        path: ["sampleRows"],
      }),
    shape:
      '{ "columns": ["Voltage V (V)", "Current I (mA)"], "blankRows": 6, "sampleRows": [["1.0", "10.1"], ["2.0", "19.8"]] }',
    rule: "realistic sample values a student could really record, units in the headings",
  },
  calculations: {
    schema: z.object({
      steps: z.array(text).min(1).max(12),
      check: z
        .object({
          expression: z.string().trim().min(1).max(300),
          answer: z.number(),
          unit: z.preprocess(
            (v) => (v === "" || v === null ? undefined : v),
            z.string().trim().min(1).max(40).optional(),
          ),
        })
        .optional(),
    }),
    shape:
      '{ "steps": ["markdown step with the sample values substituted"], "check": { "expression": "2.0/0.0198", "answer": 101.01, "unit": "ohm" } }',
    rule: 'worked from the sample values. When the result is a number add "check": one mathjs expression from the sample values, its exact value as "answer" (the app recomputes it; the last step and the result must state the same number). Allowed: + - * / ^ sqrt exp log log10 sin cos tan (radians) pi e abs',
  },
  graph: {
    schema: z.object({
      title: clip(80),
      xLabel: clip(40),
      yLabel: clip(40),
      points: z
        .array(z.object({ x: z.number(), y: z.number() }))
        .min(3)
        .max(60),
      line: z.enum(["straight", "smooth", "points"]),
    }),
    shape:
      '{ "title": "V-I characteristic", "xLabel": "Voltage (V)", "yLabel": "Current (mA)", "points": [{ "x": 1, "y": 10.1 }], "line": "straight" }',
    rule: "the graph drawn from the sample observations (same numbers); null if the experiment has no graph",
  },
  result: {
    schema: z.object({ statement: text, typicalRange: text }),
    shape: '{ "statement": "markdown", "typicalRange": "what students usually get, with units" }',
    rule: "the result in one or two sentences, and the usual range of values",
  },
  precautions: {
    schema: z.object({
      precautions: z.array(text).min(2).max(10),
      errors: z.array(text).min(1).max(8),
    }),
    shape: '{ "precautions": ["..."], "errors": ["..."] }',
    rule: "precautions while doing it, and sources of error",
  },
  qa: {
    schema: z
      .array(z.object({ question: text, answer: text }))
      .min(3)
      .max(8),
    shape: '[{ "question": "...", "answer": "..." }]',
    rule: "5 to 8 questions examiners commonly ask, with short exact answers",
  },
  code: {
    schema: z.array(CodeExampleSchema).min(1).max(4),
    shape: `[{ "title": "Sum of two numbers", "language": "c", "code": "#include <stdio.h>\\nint main() {\\n  int a = 2, b = 3;\\n  printf(\\"%d\\\\n\\", a + b);\\n  return 0;\\n}", "explanation": [{ "lines": "1", "text": "..." }, { "lines": "3-4", "text": "..." }], "input": "", "output": "5" }]`,
    rule: `complete programs that compile and run as written, simple to harder; "language" one of ${LANGUAGES.join(", ")}; "explanation" walks through them line by line ("lines": "3" or "3-5"); "output" is exactly what the program prints for the given "input"`,
  },
  trace: {
    schema: TraceSchema,
    shape:
      '{ "example": 1, "steps": [{ "line": 4, "note": "p gets the address of x", "vars": [{ "name": "x", "value": "10" }, { "name": "p", "value": "&x (0x7ffc)" }], "output": "", "memory": [{ "name": "x", "value": "10", "address": "0x7ffc" }, { "name": "p", "value": "0x7ffc", "pointsTo": "x" }] }] }',
    rule: 'a dry run of ONE code example (0-based "example"): each step names the line run, a short note, every variable\'s value after it, any new output, and "memory" boxes (with "pointsTo") when pointers, arrays or links matter',
  },
  fixes: {
    schema: z
      .array(z.object({ problem: text, fix: text }))
      .min(2)
      .max(8),
    shape: '[{ "problem": "error message or symptom", "fix": "why it happens and how to fix it" }]',
    rule: "the mistakes students really make, each with its fix",
  },
  practice: {
    schema: z
      .array(z.object({ question: text, hint: text.optional(), solution: text }))
      .min(2)
      .max(3),
    shape: '[{ "question": "...", "hint": "...", "solution": "markdown, code in ``` fences" }]',
    rule: "2 to 3 problems, easy to harder; solutions are hidden until the student opens them",
  },
  drawing: {
    schema: DrawingSchema,
    shape: `{ "width": 200, "height": 150, "steps": [{ "text": "Draw the reference line XY.", "shapes": [{ "type": "line", "x1": 10, "y1": 75, "x2": 190, "y2": 75, "style": "thin" }, { "type": "text", "x": 6, "y": 72, "text": "X" }] }, { "text": "...", "shapes": [{ "type": "circle", "cx": 60, "cy": 40, "r": 15 }, { "type": "dim", "x1": 45, "y1": 40, "x2": 75, "y2": 40, "text": "Ø30", "offset": -20 }] }] }`,
    rule: "a drawing in millimetres on a sheet (x right, y DOWN, origin top-left), built in steps; shapes: line, circle, arc (cx, cy, r, start, end in degrees anticlockwise), polyline (points, closed), text, dim (a dimension from x1,y1 to x2,y2 with its text); style: object (thick visible edge), thin, hidden (dashed), center (chain), construction (light). Every shape inside the sheet. Geometry must be correct: the projections and sizes must agree with the problem",
  },
  codes: {
    schema: z
      .array(
        z.object({
          number: z
            .string()
            .regex(/^IS[\s:]*\d[\w\s:().-]*$/, 'like "IS 2720 (Part 4)"')
            .max(40),
          title: clip(160),
        }),
      )
      .min(1)
      .max(4),
    shape:
      '[{ "number": "IS 2720 (Part 4)", "title": "Methods of test for soils: grain size analysis" }]',
    rule: "the Indian Standard(s) for this test: number and title ONLY, never quote their text; only codes you are sure exist",
  },
  simulation: {
    schema: LabSimulationSchema.nullable(),
    shape: "",
    rule: "",
  },
  videos: {
    schema: z.null(),
    shape: "",
    rule: "",
  },
} as const;

export type SectionKind = keyof typeof SECTION_KINDS;
export type SectionValue<K extends SectionKind> = z.infer<(typeof SECTION_KINDS)[K]["schema"]>;

/** Kinds the app fills itself: the AI writes nothing for them. */
export const APP_KINDS: ReadonlySet<SectionKind> = new Set(["wiring", "videos"]);

/** Markdown strings in a section, for the KaTeX check: [path, text]. */
export function markdownOf(kind: SectionKind, value: unknown, id: string): [string, string][] {
  const at = (path: string, s: string): [string, string] => [`${id}${path}`, s];
  switch (kind) {
    case "text":
      return [at("", value as string)];
    case "theory":
      return [at(".body", (value as SectionValue<"theory">).body)];
    case "list":
      return (value as string[]).map((s, i) => at(`.${i}`, s));
    case "steps":
      return (value as SectionValue<"steps">).map((s, i) => at(`.${i}.text`, s.text));
    case "calculations":
      return (value as SectionValue<"calculations">).steps.map((s, i) => at(`.steps.${i}`, s));
    case "result":
      return [at(".statement", (value as SectionValue<"result">).statement)];
    case "precautions": {
      const v = value as SectionValue<"precautions">;
      return [...v.precautions, ...v.errors].map((s, i) => at(`.${i}`, s));
    }
    case "qa":
      return (value as SectionValue<"qa">).map((q, i) => at(`.${i}.answer`, q.answer));
    case "practice":
      return (value as SectionValue<"practice">).map((q, i) => at(`.${i}.question`, q.question));
    default:
      return [];
  }
}
