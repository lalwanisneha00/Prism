/*
 * PhET Interactive Simulations (University of Colorado Boulder), licensed CC BY 4.0.
 * Each id below was checked to exist as an embeddable HTML5 simulation.
 */
export type PhetSim = { id: string; title: string; topics: string[] };

export const phetSims: PhetSim[] = [
  {
    id: "charges-and-fields",
    title: "Charges and Fields",
    topics: [
      "electric-field",
      "electric-potential",
      "equipotential-surfaces",
      "electric-dipole",
      "gauss-law",
      "electric-flux",
    ],
  },
  { id: "coulombs-law", title: "Coulomb's Law", topics: ["coulombs-law"] },
  {
    id: "capacitor-lab-basics",
    title: "Capacitor Lab: Basics",
    topics: ["capacitors", "parallel-plate-capacitor", "capacitor-energy", "dielectrics"],
  },
  {
    id: "circuit-construction-kit-dc",
    title: "Circuit Construction Kit: DC",
    topics: [
      "ohms-law",
      "resistor-combinations",
      "kirchhoffs-laws",
      "electrical-power",
      "current-drift-velocity",
      "capacitor-combinations",
    ],
  },
  {
    id: "circuit-construction-kit-ac",
    title: "Circuit Construction Kit: AC",
    topics: ["ac-rms", "impedance", "lcr-resonance", "phasors", "rc-circuits", "inductance"],
  },
  { id: "ohms-law", title: "Ohm's Law", topics: ["ohms-law"] },
  {
    id: "resistance-in-a-wire",
    title: "Resistance in a Wire",
    topics: ["ohms-law", "current-drift-velocity"],
  },
  {
    id: "faradays-law",
    title: "Faraday's Law",
    topics: ["faradays-law", "lenzs-law", "magnetic-flux"],
  },
  {
    id: "faradays-electromagnetic-lab",
    title: "Faraday's Electromagnetic Lab",
    topics: ["faradays-law", "transformers", "ac-generator", "solenoid-toroid", "inductance"],
  },
  {
    id: "magnets-and-electromagnets",
    title: "Magnets and Electromagnets",
    topics: ["solenoid-toroid", "biot-savart-law", "amperes-law", "magnetic-materials"],
  },
  { id: "generator", title: "Generator", topics: ["ac-generator", "faradays-law", "motional-emf"] },
  // Engineering Mathematics (V2 · Step 6)
  {
    id: "calculus-grapher",
    title: "Calculus Grapher",
    topics: [
      "derivatives-basics",
      "definite-integrals",
      "maxima-minima-one-variable",
      "mean-value-theorems",
      "successive-differentiation",
    ],
  },
  {
    id: "fourier-making-waves",
    title: "Fourier: Making Waves",
    topics: ["fourier-series", "half-range-series"],
  },
  {
    id: "vector-addition",
    title: "Vector Addition",
    topics: ["gradient-divergence-curl", "directional-derivative", "linear-transformations"],
  },
];

export const PHET_ATTRIBUTION = "PhET Interactive Simulations, University of Colorado Boulder";
export const PHET_LICENSE = "CC BY 4.0";

export function findPhetSim(id: string): PhetSim | undefined {
  return phetSims.find((s) => s.id === id);
}

export function phetEmbedUrl(id: string): string {
  return `https://phet.colorado.edu/sims/html/${id}/latest/${id}_all.html`;
}

export function phetSimsForTopic(topicId: string): PhetSim[] {
  return phetSims.filter((s) => s.topics.includes(topicId));
}
