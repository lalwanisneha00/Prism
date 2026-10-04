import { z } from "zod";

/*
 * Wave 1 widgets (V3 · Step 7): their parameters (checked before drawing), the help line the
 * AI sees, and the exact topics each one fits. Spread into widgetRegistry in ../registry.ts.
 */

const num = (min: number, max: number) => z.number().min(min).max(max);

const force = z.object({ magnitude: num(0, 100), angleDeg: num(0, 359) });
const complex = z.object({ re: num(-20, 20), im: num(-20, 20) });
const pole = z.object({ re: num(-2.8, 2.8), im: num(-1.6, 1.6), residue: complex });

export const wave1Widgets = {
  oscillator: {
    name: "Damped and driven oscillator",
    params: z.object({ omega0: num(1, 6), gamma: num(0, 8), view: z.enum(["time", "resonance"]) }),
    help: 'omega0 rad/s (1..6); gamma = b/2m (0..8; equal to omega0 is critical damping); view "time" (decaying motion) or "resonance" (amplitude against driving frequency).',
    topics: [
      "simple-harmonic-motion",
      "damped-oscillations",
      "forced-oscillations-resonance",
      "electrical-oscillators",
    ],
  },
  "standing-wave": {
    name: "Standing waves on a string",
    params: z.object({
      harmonic: z.int().min(1).max(8),
      length: num(0.2, 5),
      tension: num(1, 500),
      massPerLength: num(0.0005, 0.1),
    }),
    help: "harmonic n (1..8); length m (0.2..5); tension N (1..500); massPerLength kg/m (0.0005..0.1). Shows nodes, antinodes and f_n = n v / 2L.",
    topics: [
      "standing-waves",
      "waves-on-a-string",
      "wave-equation",
      "reflection-transmission-waves",
    ],
  },
  "slit-pattern": {
    name: "Single/double-slit and grating intensity pattern",
    params: z.object({
      slits: z.int().min(1).max(8),
      widthUm: num(0.5, 20),
      spacingUm: num(2, 40),
      wavelengthNm: num(400, 700),
    }),
    help: "slits N (1 = single slit, 2 = Young's double slit, more = grating); widthUm slit width µm (0.5..20); spacingUm µm (2..40, > width); wavelengthNm (400..700).",
    topics: [
      "interference",
      "single-slit-diffraction",
      "diffraction-grating-resolution",
      "biprism",
      "thin-films-newtons-rings",
    ],
  },
  "quantum-box": {
    name: "Particle in a box",
    params: z.object({ level: z.int().min(1).max(6), widthNm: num(0.2, 3) }),
    help: "level n (1..6); widthNm box width for an electron (0.2..3). Shows ψ, |ψ|² and Eₙ = n²h²/8mL².",
    topics: [
      "particle-in-a-box",
      "wave-function",
      "schrodinger-equation",
      "schrodinger-particle-in-box-chem",
      "uncertainty-principle",
    ],
  },
  "beer-lambert": {
    name: "Beer–Lambert law",
    params: z.object({ epsilon: num(10, 500), pathCm: num(0.1, 5), concentration: num(0, 0.01) }),
    help: "epsilon L/(mol·cm) (10..500); pathCm (0.1..5); concentration mol/L (0..0.01). Absorbance A = εlc.",
    topics: ["spectroscopy-principles", "uv-visible-spectroscopy"],
  },
  "phase-diagram": {
    name: "Phase diagram of water",
    params: z.object({ temperatureK: num(200, 750), pressureKpa: num(0.01, 100000) }),
    help: "temperatureK (200..750); pressureKpa (0.01..100000). Shows the phase, triple and critical points, and the phase rule.",
    topics: ["gibbs-phase-rule", "one-component-systems", "real-gases-critical"],
  },
  "nernst-cell": {
    name: "Nernst equation for a galvanic cell",
    params: z.object({ standardEmf: num(-3, 3), electrons: z.int().min(1).max(4) }),
    help: "standardEmf E° in volts (-3..3, e.g. 1.10 for the Daniell cell); electrons n transferred (1..4). Student varies Q and temperature.",
    topics: [
      "nernst-equation",
      "thermodynamic-functions",
      "electrochemical-corrosion",
      "batteries",
    ],
  },
  "three-phase": {
    name: "Three-phase supply: waveforms, phasors, star and delta",
    params: z.object({
      lineVoltage: num(100, 11000),
      impedance: num(1, 1000),
      pfAngleDeg: num(0, 80),
      connection: z.enum(["star", "delta"]),
    }),
    help: 'lineVoltage V (100..11000, e.g. 400); impedance per phase Ω (1..1000); pfAngleDeg (0..80); connection "star" or "delta".',
    topics: [
      "three-phase-generation",
      "star-delta",
      "balanced-three-phase",
      "three-phase-power-measurement",
      "rotating-magnetic-field",
    ],
  },
  "first-order-transient": {
    name: "RC / RL transient",
    params: z.object({
      circuit: z.enum(["RC", "RL"]),
      supplyV: num(1, 240),
      resistance: num(10, 10000),
      reactiveValue: num(1, 1000),
    }),
    help: 'circuit "RC" or "RL"; supplyV (1..240); resistance Ω (10..10000); reactiveValue = capacitance in µF for RC or inductance in mH for RL (1..1000).',
    topics: ["rl-rc-transients", "circuit-elements-sources"],
  },
  transformer: {
    name: "Transformer: turns ratio and efficiency",
    params: z.object({
      primaryV: num(10, 11000),
      primaryTurns: z.int().min(10).max(5000),
      secondaryTurns: z.int().min(10).max(10000),
      ratedKva: num(0.1, 1000),
      coreLossW: num(1, 20000),
      fullLoadCuLossW: num(1, 40000),
    }),
    help: "primaryV; primaryTurns and secondaryTurns (integers); ratedKva; coreLossW (iron loss); fullLoadCuLossW (copper loss at full load).",
    topics: [
      "ideal-practical-transformer",
      "transformer-equivalent-circuit",
      "transformer-losses-efficiency",
      "auto-three-phase-transformers",
    ],
  },
  "torque-slip": {
    name: "Induction motor torque–slip curve",
    params: z.object({
      rotorResistance: num(0.02, 1.5),
      rotorReactance: num(0.2, 5),
      poles: z.int().min(2).max(12),
      frequency: num(25, 60),
    }),
    help: "rotorResistance R₂ Ω (0.02..1.5); rotorReactance X₂ Ω (0.2..5); poles (even, 2..12); frequency Hz (25..60).",
    topics: [
      "three-phase-induction-motor",
      "induction-motor-starting-speed",
      "single-phase-induction-motor",
    ],
  },
  "diode-rectifier": {
    name: "Diode characteristic and rectifiers",
    params: z.object({ peakV: num(2, 24), mode: z.enum(["curve", "half", "full", "bridge"]) }),
    help: 'peakV input sine peak (2..24); mode "curve" (V–I characteristic), "half", "full" or "bridge" rectifier.',
    topics: [
      "pn-junction-diode",
      "diode-resistance-equivalent",
      "rectifiers",
      "semiconductor-intro",
      "pn-junction-physics",
    ],
  },
  "load-line": {
    name: "BJT DC load line and Q-point",
    params: z.object({
      vcc: num(5, 30),
      rc: num(100, 20000),
      re: num(0, 5000),
      r1: num(1000, 200000),
      r2: num(1000, 100000),
      beta: num(20, 400),
    }),
    help: "vcc V; rc, re, r1, r2 in Ω (voltage-divider bias); beta current gain (20..400).",
    topics: ["load-line-biasing", "bjt-configurations", "bjt-operation", "amplifier-basics"],
  },
  "op-amp": {
    name: "Inverting / non-inverting op-amp",
    params: z.object({
      mode: z.enum(["inverting", "non-inverting"]),
      rf: num(1000, 100000),
      rin: num(500, 100000),
      rail: num(5, 18),
    }),
    help: 'mode "inverting" or "non-inverting"; rf feedback Ω; rin input Ω; rail supply volts (5..18) where the output clips.',
    topics: [
      "ideal-op-amp",
      "inverting-non-inverting",
      "op-amp-parameters",
      "op-amp-integrator-differentiator",
    ],
  },
  "logic-gates": {
    name: "Logic gates and truth tables (with full adder)",
    params: z.object({
      gate: z.enum(["AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR", "FULL-ADDER"]),
    }),
    help: 'gate: one of "AND","OR","NOT","NAND","NOR","XOR","XNOR","FULL-ADDER". Students toggle inputs and see the truth table.',
    topics: [
      "logic-gates",
      "boolean-algebra",
      "universal-gates",
      "standard-forms-truth-tables",
      "combinational-circuits-adders",
      "cmos-inverter",
    ],
  },
  "force-resultant": {
    name: "Resultant of concurrent forces",
    params: z.object({ forces: z.array(force).min(2).max(4) }),
    help: 'forces: 2-4 of {magnitude N (0..100), angleDeg (0..359, from +x anticlockwise)}. Example: [{"magnitude":40,"angleDeg":30},{"magnitude":25,"angleDeg":150}].',
    topics: [
      "force-resolution",
      "resultant-force-system",
      "equilibrium-coplanar",
      "free-body-diagrams",
      "vectors-and-kinematics",
    ],
  },
  "incline-friction": {
    name: "Block on an inclined plane with friction",
    params: z.object({ angleDeg: num(0, 60), muStatic: num(0, 1), muKinetic: num(0, 1) }),
    help: "angleDeg (0..60); muStatic (0..1); muKinetic (0..1, ≤ muStatic). Shows whether it slides and the angle of repose.",
    topics: ["laws-of-friction", "friction-applications", "friction-and-constraints"],
  },
  projectile: {
    name: "Projectile motion",
    params: z.object({ speed: num(5, 40), angleDeg: num(5, 85) }),
    help: "speed m/s (5..40); angleDeg (5..85). Shows path, range, maximum height and time of flight.",
    topics: ["curvilinear-projectile", "rectilinear-motion"],
  },
  "conic-eccentricity": {
    name: "Conic sections by the eccentricity method",
    params: z.object({ eccentricity: num(0.2, 1.8), distance: num(1, 5) }),
    help: "eccentricity e (0.2..1.8: <1 ellipse, 1 parabola, >1 hyperbola); distance focus-to-directrix (1..5).",
    topics: ["conic-sections-drawing"],
  },
  "roulette-curves": {
    name: "Cycloid, epicycloid, hypocycloid and involute",
    params: z.object({ curve: z.enum(["cycloid", "epicycloid", "hypocycloid", "involute"]) }),
    help: 'curve: "cycloid", "epicycloid", "hypocycloid" or "involute". The student rolls the circle step by step.',
    topics: ["cycloids-involutes"],
  },
  "orthographic-views": {
    name: "Orthographic views of simple solids",
    params: z.object({ solid: z.enum(["prism", "pyramid", "cylinder", "cone"]) }),
    help: 'solid: "prism", "pyramid", "cylinder" or "cone" (axis vertical, first-angle projection: front view above XY, top view below).',
    topics: [
      "projection-of-solids",
      "projection-principles",
      "sections-of-solids",
      "isometric-to-orthographic",
    ],
  },
  "sort-stepper": {
    name: "Sorting step by step",
    params: z.object({
      algorithm: z.enum(["bubble", "insertion", "selection"]),
      values: z.array(z.int().min(1).max(99)).min(3).max(10),
    }),
    help: 'algorithm "bubble", "insertion" or "selection"; values 3-10 integers (1..99), e.g. [29, 10, 14, 37, 13].',
    topics: ["basic-sorting", "order-of-complexity", "one-d-arrays"],
  },
  "binary-search": {
    name: "Binary search step by step",
    params: z.object({
      values: z.array(z.int().min(0).max(999)).min(4).max(16),
      target: z.int().min(0).max(999),
    }),
    help: "values 4-16 integers (0..999; sorted for the student); target integer to find.",
    topics: ["searching", "order-of-complexity"],
  },
  "recursion-tree": {
    name: "Recursion tree (factorial / Fibonacci)",
    params: z.object({ fn: z.enum(["factorial", "fibonacci"]), n: z.int().min(1).max(8) }),
    help: 'fn "factorial" (n 1..8) or "fibonacci" (n 1..6): shows every call and why naive Fibonacci repeats work.',
    topics: ["recursion", "python-recursion", "merge-quick-sort", "functions-basics"],
  },
  "energy-pyramid": {
    name: "Pyramid of energy",
    params: z.object({ producerEnergy: num(100, 1000000), efficiency: num(0.05, 0.25) }),
    help: "producerEnergy kJ (100..1000000); efficiency transferred per level (0.05..0.25, about 0.1 is the 10% rule).",
    topics: ["energy-flow-food-chains", "producers-consumers-decomposers", "ecosystem-concept"],
  },
  "population-growth": {
    name: "Exponential and logistic population growth",
    params: z.object({ initial: num(1, 1000), rate: num(0.02, 0.5), capacity: num(200, 5000) }),
    help: "initial population (1..1000); rate r per year (0.02..0.5); capacity K (200..5000).",
    topics: ["population-growth", "sustainable-development"],
  },
  "rainwater-harvesting": {
    name: "Rainwater harvesting calculator",
    params: z.object({ areaM2: num(20, 1000), rainfallMm: num(100, 3000), runoff: num(0.3, 0.95) }),
    help: "areaM2 roof/catchment area (20..1000); rainfallMm annual rainfall (100..3000); runoff coefficient (0.3..0.95, about 0.8 for a concrete roof).",
    topics: ["water-conservation", "water-resources"],
  },
  "complex-mapping": {
    name: "Complex mapping w = f(z)",
    params: z.object({ map: z.enum(["z^2", "exp(z)", "1/z", "mobius", "sin(z)"]) }),
    help: 'map: "z^2", "exp(z)", "1/z", "mobius" ((z−1)/(z+1)) or "sin(z)". Shows a grid and its image, and checks the Cauchy–Riemann equations.',
    topics: [
      "analytic-functions-cauchy-riemann",
      "harmonic-functions",
      "elementary-complex-functions",
      "conformal-mobius",
    ],
  },
  "residue-contour": {
    name: "Residue theorem with a movable contour",
    params: z.object({ poles: z.array(pole).min(1).max(4) }),
    help: 'poles: 1-4 of {re (-2.8..2.8), im (-1.6..1.6), residue {re, im}}. Example: [{"re":0,"im":0,"residue":{"re":1,"im":0}},{"re":1.5,"im":0,"residue":{"re":-0.5,"im":0}}].',
    topics: [
      "residue-theorem",
      "real-integrals-by-residues",
      "contour-integrals-cauchy",
      "taylor-laurent-singularities",
    ],
  },
} as const;
