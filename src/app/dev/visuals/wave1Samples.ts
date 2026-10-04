import type { VisualSpec } from "@/lib/schema";

/** One example of every Wave 1 widget (V3 · Step 7), grouped by subject, for the gallery. */
export const wave1Samples: { subject: string; visual: VisualSpec }[] = [
  {
    subject: "Applied Physics",
    visual: {
      type: "widget",
      widget: "oscillator",
      params: { omega0: 3, gamma: 0.4, view: "time" },
      caption: "A lightly damped oscillator: the amplitude dies away inside the e^(−γt) envelope.",
    },
  },
  {
    subject: "Applied Physics",
    visual: {
      type: "widget",
      widget: "standing-wave",
      params: { harmonic: 3, length: 1, tension: 100, massPerLength: 0.01 },
      caption: "The third harmonic: four nodes, three antinodes.",
    },
  },
  {
    subject: "Applied Physics",
    visual: {
      type: "widget",
      widget: "slit-pattern",
      params: { slits: 2, widthUm: 2, spacingUm: 10, wavelengthNm: 550 },
      caption: "Young's double slit: fringes inside the single-slit envelope.",
    },
  },
  {
    subject: "Applied Physics",
    visual: {
      type: "widget",
      widget: "quantum-box",
      params: { level: 2, widthNm: 1 },
      caption: "The n = 2 state of an electron in a 1 nm box.",
    },
  },
  {
    subject: "Engineering Chemistry",
    visual: {
      type: "widget",
      widget: "beer-lambert",
      params: { epsilon: 200, pathCm: 1, concentration: 0.004 },
      caption: "Absorbance rises in a straight line with concentration.",
    },
  },
  {
    subject: "Engineering Chemistry",
    visual: {
      type: "widget",
      widget: "phase-diagram",
      params: { temperatureK: 300, pressureKpa: 101.325 },
      caption: "Water at room conditions is a liquid; drag the point across the lines.",
    },
  },
  {
    subject: "Engineering Chemistry",
    visual: {
      type: "widget",
      widget: "nernst-cell",
      params: { standardEmf: 1.1, electrons: 2 },
      caption: "The Daniell cell: E falls as products build up.",
    },
  },
  {
    subject: "Basic Electrical Engineering",
    visual: {
      type: "widget",
      widget: "three-phase",
      params: { lineVoltage: 400, impedance: 20, pfAngleDeg: 30, connection: "star" },
      caption: "A 400 V star-connected load: V_ph = V_L/√3.",
    },
  },
  {
    subject: "Basic Electrical Engineering",
    visual: {
      type: "widget",
      widget: "first-order-transient",
      params: { circuit: "RC", supplyV: 12, resistance: 1000, reactiveValue: 100 },
      caption: "An RC circuit charging with τ = RC = 100 ms.",
    },
  },
  {
    subject: "Basic Electrical Engineering",
    visual: {
      type: "widget",
      widget: "transformer",
      params: {
        primaryV: 230,
        primaryTurns: 1000,
        secondaryTurns: 100,
        ratedKva: 5,
        coreLossW: 50,
        fullLoadCuLossW: 120,
      },
      caption: "A 230/23 V transformer: efficiency peaks where copper loss equals core loss.",
    },
  },
  {
    subject: "Basic Electrical Engineering",
    visual: {
      type: "widget",
      widget: "torque-slip",
      params: { rotorResistance: 0.2, rotorReactance: 1, poles: 4, frequency: 50 },
      caption: "A 4-pole, 50 Hz induction motor: maximum torque at s = R₂/X₂.",
    },
  },
  {
    subject: "Basic Electronics",
    visual: {
      type: "widget",
      widget: "diode-rectifier",
      params: { peakV: 12, mode: "bridge" },
      caption: "A bridge rectifier flips the negative half-cycles.",
    },
  },
  {
    subject: "Basic Electronics",
    visual: {
      type: "widget",
      widget: "load-line",
      params: { vcc: 12, rc: 2200, re: 1000, r1: 47000, r2: 10000, beta: 100 },
      caption: "Voltage-divider bias puts the Q-point in the middle of the load line.",
    },
  },
  {
    subject: "Basic Electronics",
    visual: {
      type: "widget",
      widget: "op-amp",
      params: { mode: "inverting", rf: 10000, rin: 1000, rail: 12 },
      caption: "An inverting amplifier with gain −10; push the input to see clipping.",
    },
  },
  {
    subject: "Basic Electronics",
    visual: {
      type: "widget",
      widget: "logic-gates",
      params: { gate: "NAND" },
      caption: "NAND: the universal gate. Toggle the inputs.",
    },
  },
  {
    subject: "Engineering Mechanics",
    visual: {
      type: "widget",
      widget: "force-resultant",
      params: {
        forces: [
          { magnitude: 40, angleDeg: 30 },
          { magnitude: 25, angleDeg: 150 },
          { magnitude: 30, angleDeg: 270 },
        ],
      },
      caption: "Three concurrent forces and their resultant.",
    },
  },
  {
    subject: "Engineering Mechanics",
    visual: {
      type: "widget",
      widget: "incline-friction",
      params: { angleDeg: 25, muStatic: 0.5, muKinetic: 0.4 },
      caption: "Raise the angle past the angle of repose and the block slides.",
    },
  },
  {
    subject: "Engineering Mechanics",
    visual: {
      type: "widget",
      widget: "projectile",
      params: { speed: 20, angleDeg: 45 },
      caption: "At 45° the range is greatest.",
    },
  },
  {
    subject: "Engineering Graphics",
    visual: {
      type: "widget",
      widget: "conic-eccentricity",
      params: { eccentricity: 0.7, distance: 3 },
      caption: "An ellipse drawn by the eccentricity method.",
    },
  },
  {
    subject: "Engineering Graphics",
    visual: {
      type: "widget",
      widget: "roulette-curves",
      params: { curve: "cycloid" },
      caption: "A cycloid: the path of a point on a rolling circle.",
    },
  },
  {
    subject: "Engineering Graphics",
    visual: {
      type: "widget",
      widget: "orthographic-views",
      params: { solid: "pyramid" },
      caption: "A square pyramid: front view triangle, top view square with diagonals.",
    },
  },
  {
    subject: "Programming for Problem Solving",
    visual: {
      type: "widget",
      widget: "sort-stepper",
      params: { algorithm: "bubble", values: [29, 10, 14, 37, 13] },
      caption: "Bubble sort: the largest value bubbles to the end each pass.",
    },
  },
  {
    subject: "Programming for Problem Solving",
    visual: {
      type: "widget",
      widget: "binary-search",
      params: { values: [3, 8, 15, 21, 34, 42, 56, 70, 88, 95], target: 56 },
      caption: "Binary search halves the range every step.",
    },
  },
  {
    subject: "Programming for Problem Solving",
    visual: {
      type: "widget",
      widget: "recursion-tree",
      params: { fn: "fibonacci", n: 5 },
      caption: "fib(5) makes 15 calls: the same values are computed again and again.",
    },
  },
  {
    subject: "Environmental Science",
    visual: {
      type: "widget",
      widget: "energy-pyramid",
      params: { producerEnergy: 10000, efficiency: 0.1 },
      caption: "The 10% rule: little energy reaches the top of a food chain.",
    },
  },
  {
    subject: "Environmental Science",
    visual: {
      type: "widget",
      widget: "population-growth",
      params: { initial: 50, rate: 0.2, capacity: 1000 },
      caption: "Exponential growth against growth limited by a carrying capacity.",
    },
  },
  {
    subject: "Environmental Science",
    visual: {
      type: "widget",
      widget: "rainwater-harvesting",
      params: { areaM2: 100, rainfallMm: 800, runoff: 0.8 },
      caption: "A 100 m² roof in a city with 800 mm of rain a year.",
    },
  },
  {
    subject: "Engineering Mathematics",
    visual: {
      type: "widget",
      widget: "complex-mapping",
      params: { map: "z^2" },
      caption: "w = z²: grid lines still meet at right angles (a conformal map).",
    },
  },
  {
    subject: "Engineering Mathematics",
    visual: {
      type: "widget",
      widget: "residue-contour",
      params: {
        poles: [
          { re: 0, im: 0, residue: { re: 1, im: 0 } },
          { re: 1.5, im: 0.5, residue: { re: -0.5, im: 0 } },
        ],
      },
      caption: "Only the poles inside the contour contribute to the integral.",
    },
  },
];
