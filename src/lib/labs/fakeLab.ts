import { ARCHETYPES, type Archetype } from "@/lib/labs/archetypes";
import { APP_KINDS, type SectionKind } from "@/lib/labs/sections";

/*
 * Canned lab lessons v2 for LLM_PROVIDER=fake and tests (syllabus fix, Phase 7C): one valid
 * sample per section kind, so every archetype can be opened without an AI key.
 */

const SAMPLES: Partial<Record<SectionKind, unknown>> = {
  text: "To study the $V$-$I$ characteristic of a resistor and verify Ohm's law.",
  theory: {
    body: "Ohm's law says the current through a conductor is proportional to the voltage across it, $V = IR$, at constant temperature.",
    formulas: [{ latex: "R = \\frac{V}{I}", meaning: "resistance from one reading" }],
  },
  list: [
    "DC power supply (0-10 V)",
    "Ammeter (0-100 mA)",
    "Voltmeter (0-10 V)",
    "Resistor (100 Ω)",
  ],
  steps: [
    { text: "Set the supply to 1 V and note both meters.", parts: [] },
    { text: "Raise the voltage in steps of 1 V and note each reading.", parts: [] },
    { text: "Switch off the supply after the last reading.", parts: [] },
  ],
  setup: {
    parts: [
      { id: "source", label: "Lamp", icon: "lamp", role: "light source" },
      { id: "lens", label: "Convex lens", icon: "lens" },
      { id: "screen", label: "Screen", icon: "screen" },
    ],
    links: [
      { from: "source", to: "lens", kind: "light" },
      { from: "lens", to: "screen", kind: "light" },
    ],
  },
  circuit: {
    components: [
      { id: "B1", type: "dc-supply", label: "DC supply", value: 5, adjust: { min: 0, max: 10 } },
      { id: "A1", type: "ammeter", label: "Ammeter (0-100 mA)" },
      { id: "R1", type: "resistor", label: "Resistor", value: 100 },
      { id: "V1", type: "voltmeter", label: "Voltmeter (0-10 V)" },
    ],
    connections: [
      { from: "B1.+", to: "A1.+" },
      { from: "A1.-", to: "R1.1" },
      { from: "R1.2", to: "B1.-" },
      { from: "V1.+", to: "R1.1" },
      { from: "V1.-", to: "R1.2" },
    ],
    wiring: [
      {
        text: "Connect the + terminal of the supply to the + terminal of the ammeter.",
        connections: [0],
      },
      {
        text: "Connect the ammeter's - terminal to the resistor, and the resistor back to the supply's -.",
        connections: [1, 2],
      },
      { text: "Connect the voltmeter across the resistor.", connections: [3, 4] },
    ],
    plot: { sweep: "B1", x: "V1", y: "A1", xLabel: "Voltage V (V)", yLabel: "Current I (A)" },
  },
  observations: {
    columns: ["Voltage V (V)", "Current I (mA)"],
    blankRows: 6,
    sampleRows: [
      ["1.0", "10.0"],
      ["2.0", "20.0"],
      ["3.0", "30.0"],
    ],
  },
  calculations: {
    steps: ["$R = \\frac{V}{I} = \\frac{2.0}{0.020} = 100\\ \\Omega$"],
    check: { expression: "2.0/0.020", answer: 100, unit: "ohm" },
  },
  graph: {
    title: "V-I characteristic",
    xLabel: "Voltage (V)",
    yLabel: "Current (mA)",
    points: [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ],
    line: "straight",
  },
  result: {
    statement: "The resistance is 100 Ω; the graph is a straight line.",
    typicalRange: "95 to 105 Ω",
  },
  precautions: {
    precautions: [
      "Keep the current small so the resistor does not heat up.",
      "Tap the meters gently before reading.",
    ],
    errors: ["Zero error in the meters."],
  },
  qa: [
    {
      question: "State Ohm's law.",
      answer: "Current is proportional to voltage at constant temperature.",
    },
    { question: "What is the unit of resistance?", answer: "The ohm (Ω)." },
    {
      question: "Why is the voltmeter in parallel?",
      answer: "It measures the potential difference across the part.",
    },
    { question: "Why is the ammeter in series?", answer: "The same current must flow through it." },
    {
      question: "What does the slope of V-I give?",
      answer: "The reciprocal of resistance, for I against V.",
    },
  ],
  code: [
    {
      title: "Print a number",
      language: "python",
      code: "x = 5\nprint(x * 2)",
      explanation: [
        { lines: "1", text: "Store 5 in x." },
        { lines: "2", text: "Print twice x." },
      ],
      output: "10",
    },
    {
      title: "Sum of a list",
      language: "python",
      code: "nums = [1, 2, 3]\ntotal = 0\nfor n in nums:\n    total += n\nprint(total)",
      explanation: [
        { lines: "1-2", text: "A list and a running total." },
        { lines: "3-4", text: "Add each number." },
        { lines: "5", text: "Print the total." },
      ],
      output: "6",
    },
  ],
  trace: {
    example: 1,
    steps: [
      { line: 2, note: "total starts at 0", vars: [{ name: "total", value: "0" }] },
      {
        line: 4,
        note: "add 1",
        vars: [
          { name: "n", value: "1" },
          { name: "total", value: "1" },
        ],
      },
      {
        line: 4,
        note: "add 2",
        vars: [
          { name: "n", value: "2" },
          { name: "total", value: "3" },
        ],
      },
      { line: 5, note: "print", vars: [{ name: "total", value: "6" }], output: "6" },
    ],
  },
  fixes: [
    { problem: "IndentationError", fix: "Indent the loop body by four spaces." },
    { problem: "NameError: total", fix: "Set total = 0 before the loop." },
  ],
  practice: [
    {
      question: "Print the numbers 1 to 5.",
      hint: "Use range.",
      solution: "```python\nfor i in range(1, 6):\n    print(i)\n```",
    },
    { question: "Find the largest of three numbers.", solution: "Use max(a, b, c)." },
  ],
  drawing: {
    width: 200,
    height: 120,
    steps: [
      {
        text: "Draw the reference line XY.",
        shapes: [
          { type: "line", x1: 10, y1: 60, x2: 190, y2: 60, style: "thin" },
          { type: "text", x: 4, y: 58, text: "X" },
          { type: "text", x: 192, y: 58, text: "Y" },
        ],
      },
      {
        text: "Draw the top view, a circle of 30 mm diameter, 20 mm below XY.",
        shapes: [
          { type: "circle", cx: 100, cy: 95, r: 15 },
          { type: "dim", x1: 85, y1: 95, x2: 115, y2: 95, text: "Ø30", offset: 20 },
        ],
      },
    ],
  },
  codes: [{ number: "IS 2720 (Part 4)", title: "Methods of test for soils: grain size analysis" }],
  simulation: null,
};

export function fakeLabSections(archetype: Archetype): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const s of archetype.sections) {
    if (APP_KINDS.has(s.kind)) continue;
    out[s.id] = s.optional ? null : (SAMPLES[s.kind] ?? null);
  }
  // The sample circuit's procedure uses no setup parts; a setup's steps point at its parts.
  for (const s of archetype.sections) {
    if (s.kind !== "steps" || !s.diagram) continue;
    const target = archetype.sections.find((t) => t.id === s.diagram);
    if (target?.kind === "setup")
      out[s.id] = [
        { text: "Arrange the parts on the bench as shown.", parts: ["source", "lens", "screen"] },
        { text: "Move the screen until the image is sharp.", parts: ["screen"] },
        { text: "Note the distances.", parts: [] },
      ];
  }
  return out;
}

/** The fake provider's reply: finds the archetype named in the system prompt. */
export function fakeLabReply(promptText: string): string {
  const archetype =
    [...ARCHETYPES.archetypes, ARCHETYPES.generic].find((a) =>
      promptText.includes(`"${a.name}" lab`),
    ) ?? ARCHETYPES.generic;
  const sections = fakeLabSections(archetype);
  // When the coil template is on offer, use it (as the Phase 7B fake did).
  const sim = archetype.sections.find((s) => s.kind === "simulation");
  if (sim && promptText.includes('"widget":"coil-field"'))
    sections[sim.id] = {
      type: "widget",
      widget: "coil-field",
      params: { coils: 1, radiusCm: 5, turns: 50, current: 0.5, separationCm: 5 },
      caption: "Move the probe along the axis and watch the field fall off.",
    };
  return JSON.stringify({ sections });
}
