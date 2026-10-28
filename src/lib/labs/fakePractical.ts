/*
 * A canned practical lesson body for LLM_PROVIDER=fake and tests (syllabus fix, Phase 7B). It
 * passes every check; when the coil template is on offer it uses it, otherwise no simulation.
 */
export function fakePracticalBody(prompt: string): Record<string, unknown> {
  const coil = prompt.includes('"widget":"coil-field"');
  return {
    aim: "To study the variation of the magnetic field along the axis of a circular coil.",
    theory: {
      body: "A current $I$ in a coil of $N$ turns and radius $R$ makes a field along its axis. At distance $x$ from the centre:\n\n$$B = \\frac{\\mu_0 N I R^2}{2(R^2+x^2)^{3/2}}$$\n\nThe field is largest at the centre and falls off on both sides.",
      formulas: [
        {
          latex: "B = \\frac{\\mu_0 N I R^2}{2(R^2+x^2)^{3/2}}",
          meaning: "field on the axis at distance x from the centre",
        },
      ],
    },
    apparatus: {
      items: ["Stewart and Gee apparatus", "Battery eliminator", "Ammeter (0-1 A)", "Rheostat"],
      parts: [
        { id: "supply", label: "Power supply" },
        { id: "rheostat", label: "Rheostat", role: "sets the current" },
        { id: "ammeter", label: "Ammeter" },
        { id: "coil", label: "Circular coil" },
        { id: "compass", label: "Deflection magnetometer", role: "reads the field" },
      ],
      links: [
        { from: "supply", to: "rheostat", label: "wire" },
        { from: "rheostat", to: "ammeter", label: "wire" },
        { from: "ammeter", to: "coil", label: "wire" },
      ],
    },
    procedure: [
      { text: "Set the coil in the magnetic meridian.", parts: ["coil"] },
      {
        text: "Connect the circuit and set a current of 0.5 A.",
        parts: ["supply", "rheostat", "ammeter"],
      },
      {
        text: "Place the compass at the centre and read the deflection.",
        parts: ["compass", "coil"],
      },
      { text: "Move the compass along the axis in 2 cm steps and read again.", parts: ["compass"] },
    ],
    observations: {
      columns: ["Distance x (cm)", "Deflection θ (°)", "tan θ"],
      blankRows: 6,
      sampleRows: [
        ["0", "45", "1.000"],
        ["2", "41", "0.869"],
        ["4", "32", "0.625"],
      ],
    },
    calculations: {
      steps: [
        "At the centre, $B = \\frac{\\mu_0 N I}{2R} = \\frac{4\\pi\\times10^{-7}\\times 50 \\times 0.5}{2\\times 0.1}$",
        "So B = 0.000157 T at the centre.",
      ],
      check: { expression: "4*pi*1e-7*50*0.5/(2*0.1)", answer: 0.000157, unit: "T" },
    },
    result: {
      statement: "The field at the centre is 0.000157 T and falls off along the axis as predicted.",
      typicalRange: "Measured values usually agree with the formula within 5 to 10%.",
    },
    precautions: [
      "Keep magnets and iron away from the compass.",
      "Tap the compass before reading.",
    ],
    errors: ["The coil may not be exactly in the magnetic meridian."],
    viva: [
      { question: "Where is the field largest?", answer: "At the centre of the coil." },
      { question: "What is the unit of B?", answer: "The tesla (T)." },
      {
        question: "Why read both ends of the pointer?",
        answer: "To cancel the error from an off-centre pivot.",
      },
      { question: "What does the rheostat do?", answer: "It sets the current." },
      {
        question: "What is Helmholtz spacing?",
        answer: "Two coils a radius apart, giving a nearly uniform field between them.",
      },
    ],
    simulation: coil
      ? {
          type: "widget",
          widget: "coil-field",
          params: { coils: 1, radiusCm: 5, turns: 50, current: 0.5, separationCm: 5 },
          caption: "Move the probe along the axis and watch the field fall off.",
        }
      : null,
  };
}
