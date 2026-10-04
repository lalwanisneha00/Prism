/*
 * Underlying skills shared by topics across subjects (SPEC §12.9 part 2.2), as data. A topic's
 * `skills` list in its subject file wins; topics without one (and the student's own "Other
 * subjects") get skills from these keyword rules. Keep each rule narrow: a skill tag means "a
 * student weak at one of these topics may find the others harder".
 */
export type SkillRule = { id: string; label: string; keywords: RegExp };

export const skillRules: SkillRule[] = [
  {
    id: "differentiation",
    label: "differentiation",
    keywords:
      /\b(derivative|differentiat|gradient|partial deriv|rate of change|taylor|maxima|minima)/i,
  },
  {
    id: "integration",
    label: "integration",
    keywords:
      /\b(integra(l|tion|te)|area under|green'?s theorem|stokes|divergence theorem|line integral|surface integral|flux)/i,
  },
  {
    id: "differential-equations",
    label: "differential equations",
    keywords:
      /\b(differential equation|ode\b|pde\b|transient|first[- ]order|second[- ]order|laplace|initial condition)/i,
  },
  {
    id: "vector-calculus",
    label: "vector calculus",
    keywords: /\b(vector|curl|divergence|gradient|gauss|stokes|maxwell|field lines?|flux)/i,
  },
  {
    id: "linear-algebra",
    label: "matrices and linear algebra",
    keywords:
      /\b(matri(x|ces)|eigen|determinant|linear (system|transformation)|state[- ]space|stiffness method|rank)\b/i,
  },
  {
    id: "complex-numbers",
    label: "complex numbers and phasors",
    keywords:
      /\b(complex|phasor|impedance|ac (circuit|power)|power factor|resonance|frequency response|bode|nyquist|s-domain)/i,
  },
  {
    id: "transforms",
    label: "Laplace, Fourier and z-transforms",
    keywords:
      /\b(laplace|fourier|z-transform|dft|fft|dtft|transfer function|frequency (domain|response)|convolution)/i,
  },
  {
    id: "probability",
    label: "probability and statistics",
    keywords: /\b(probabilit|random|statistic|distribution|noise|expect|variance|bayes)/i,
  },
  {
    id: "circuit-analysis",
    label: "circuit analysis",
    keywords:
      /\b(kirchhoff|kvl|kcl|nodal|mesh|thevenin|th[eé]venin|norton|superposition|circuit|network theorem|equivalent circuit)/i,
  },
  {
    id: "free-body-diagrams",
    label: "free-body diagrams and equilibrium",
    keywords:
      /\b(free[- ]body|equilibrium|statics|support reactions?|truss|beam|moments?|couple|shear force|bending)/i,
  },
  {
    id: "stress-strain",
    label: "stress and strain",
    keywords: /\b(stress|strain|elastic|hooke|deflection|torsion|buckling|mohr)/i,
  },
  {
    id: "energy-balance",
    label: "energy and mass balances",
    keywords:
      /\b(energy balance|mass balance|material balance|first law|conservation of (energy|mass)|enthalpy|steady flow|bernoulli|continuity)/i,
  },
  {
    id: "thermodynamic-cycles",
    label: "thermodynamics",
    keywords:
      /\b(thermodynamic|entropy|carnot|rankine|otto|diesel|brayton|refrigerat|cycle efficiency|exergy|gibbs)/i,
  },
  {
    id: "fluid-flow",
    label: "fluid flow",
    keywords:
      /\b(fluid|flow|reynolds|viscosity|pipe|bernoulli|boundary layer|drag|turbulen|laminar|pump|hydraul)/i,
  },
  {
    id: "heat-transfer",
    label: "heat transfer",
    keywords:
      /\b(heat transfer|conduction|convection|radiation|fins?|heat exchanger|thermal resistance|fourier'?s law)/i,
  },
  {
    id: "kinetics-equilibrium",
    label: "chemical kinetics and equilibrium",
    keywords:
      /\b(kinetic|rate (law|constant|equation)|arrhenius|equilibrium constant|reactor|reaction rate|catalys)/i,
  },
  {
    id: "unit-conversion",
    label: "units and dimensions",
    keywords:
      /\b(units?|dimension(al|less)|si unit|conversion factor|per-unit|significant figures)/i,
  },
  {
    id: "logic-and-proof",
    label: "logic and proofs",
    keywords:
      /\b(logic|proof|induction|propositional|predicate|boolean|truth table|automat|grammar|decidab)/i,
  },
  {
    id: "recursion-and-algorithms",
    label: "algorithms and recursion",
    keywords:
      /\b(algorithm|recurs|sort|search|tree|graph|dynamic programming|greedy|complexity|big-?o)/i,
  },
  {
    id: "programming",
    label: "programming",
    keywords:
      /\b(program|code|function|loop|array|pointer|class|object|python|c programming|exception|thread)/i,
  },
  {
    id: "digital-logic",
    label: "digital logic",
    keywords:
      /\b(logic gate|boolean|flip-?flop|counter|register|karnaugh|combinational|sequential|multiplexer|adder)/i,
  },
  {
    id: "semiconductors",
    label: "semiconductor devices",
    keywords:
      /\b(diode|transistor|bjt|mosfet|fet\b|semiconductor|p-?n junction|amplifier|cmos|op-?amp)/i,
  },
  {
    id: "signals",
    label: "signals and systems",
    keywords:
      /\b(signal|sampling|aliasing|filter|modulation|spectrum|impulse response|lti|z-transform)/i,
  },
  {
    id: "electromagnetism",
    label: "electromagnetism",
    keywords:
      /\b(electric field|magnetic|faraday|induct|capacit|coulomb|gauss|ampere|electromagnet|maxwell)/i,
  },
  {
    id: "mechanics-dynamics",
    label: "dynamics and motion",
    keywords:
      /\b(newton|kinematic|velocity|acceleration|momentum|projectile|rotation|torque|vibration|oscillat|dynamics)/i,
  },
];

/** The skills a topic uses, from its name (and chapter name) when its data has no `skills` list. */
export function inferSkills(topicName: string, chapterName = ""): string[] {
  const text = `${topicName} ${chapterName}`;
  return skillRules.filter((r) => r.keywords.test(text)).map((r) => r.id);
}

export function skillLabel(id: string): string {
  return skillRules.find((r) => r.id === id)?.label ?? id;
}

/**
 * Topics heavy in numerical problems (for "you mostly get numerical questions wrong").
 * Taken from the subject's preferred visual set and the topic name.
 */
export const NUMERICAL_SETS = new Set([
  "physics",
  "maths",
  "circuits",
  "mechanics",
  "thermal",
  "fluids",
  "signals",
  "civil",
  "process",
]);
export const DESCRIPTIVE_TOPIC =
  /\b(introduction|history|overview|types of|classification|properties|ethics|management|planning|policy|role of)\b/i;
