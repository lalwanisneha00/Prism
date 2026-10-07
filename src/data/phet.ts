/*
 * PhET Interactive Simulations (University of Colorado Boulder), licensed CC BY 4.0.
 * Each id below was checked to exist as an embeddable HTML5 simulation.
 */
import { visualTopicIds } from "@/visuals/topicAliases";

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
  {
    id: "generator",
    title: "Generator",
    topics: ["ac-generator", "faradays-law", "motional-emf"],
  },
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
    id: "graphing-quadratics",
    title: "Graphing Quadratics",
    topics: ["maxima-minima-one-variable", "derivatives-basics"],
  },
  {
    id: "graphing-lines",
    title: "Graphing Lines",
    topics: ["limits-continuity", "linear-systems"],
  },
  { id: "trig-tour", title: "Trig Tour", topics: ["fourier-series", "phasors"] },
  { id: "curve-fitting", title: "Curve Fitting", topics: ["power-series", "taylor-maclaurin"] },
  {
    id: "vector-addition",
    title: "Vector Addition",
    topics: [
      "gradient-divergence-curl",
      "directional-derivative",
      "linear-transformations",
      "vectors-and-kinematics",
      "force-resolution",
      "resultant-force-system",
    ],
  },
  // Wave 1 (V3 · Step 6–7): each id checked to exist as an HTML5 simulation.
  {
    id: "pendulum-lab",
    title: "Pendulum Lab",
    topics: ["simple-harmonic-motion", "damped-oscillations"],
  },
  {
    id: "masses-and-springs",
    title: "Masses and Springs",
    topics: [
      "helical-springs",
      "free-forced-vibration",
      "simple-harmonic-motion",
      "damped-oscillations",
      "forced-oscillations-resonance",
    ],
  },
  { id: "normal-modes", title: "Normal Modes", topics: ["coupled-oscillations", "standing-waves"] },
  {
    id: "wave-on-a-string",
    title: "Wave on a String",
    topics: [
      "wave-equation",
      "waves-on-a-string",
      "reflection-transmission-waves",
      "standing-waves",
    ],
  },
  {
    id: "fourier-making-waves",
    title: "Fourier: Making Waves",
    topics: ["dispersion-group-velocity", "fourier-series"],
  },
  {
    id: "wave-interference",
    title: "Wave Interference",
    topics: [
      "interference",
      "single-slit-diffraction",
      "diffraction-grating-resolution",
      "sound-waves",
    ],
  },
  {
    id: "bending-light",
    title: "Bending Light",
    topics: ["fermats-principle", "total-internal-reflection", "optical-fibre-numerical-aperture"],
  },
  {
    id: "blackbody-spectrum",
    title: "Blackbody Spectrum",
    topics: ["blackbody-radiation"],
  },
  {
    id: "models-of-the-hydrogen-atom",
    title: "Models of the Hydrogen Atom",
    topics: ["hydrogen-atom-spin", "hydrogen-wave-functions", "einstein-coefficients"],
  },
  {
    id: "gas-properties",
    title: "Gas Properties",
    topics: [
      "systems-properties-state",
      "first-law-control-volume",
      "ideal-gas-processes",
      "thermodynamic-systems",
      "real-gases-critical",
    ],
  },
  {
    id: "energy-forms-and-changes",
    title: "Energy Forms and Changes",
    topics: ["heat-transfer-modes", "first-law", "energy-resources"],
  },
  {
    id: "projectile-motion",
    title: "Projectile Motion",
    topics: ["curvilinear-projectile", "vectors-and-kinematics"],
  },
  {
    id: "forces-and-motion-basics",
    title: "Forces and Motion: Basics",
    topics: ["newtons-laws", "friction-and-constraints", "laws-of-friction"],
  },
  {
    id: "energy-skate-park-basics",
    title: "Energy Skate Park: Basics",
    topics: ["conservative-forces-potential", "work-energy-particles"],
  },
  {
    id: "balancing-act",
    title: "Balancing Act",
    topics: ["moments-couples", "parallel-forces", "equilibrium-coplanar"],
  },
  { id: "beers-law-lab", title: "Beer's Law Lab", topics: ["spectroscopy-principles"] },
  {
    id: "molecule-shapes",
    title: "Molecule Shapes",
    topics: ["hsab-geometries", "isomerism"],
  },
  {
    id: "molecule-polarity",
    title: "Molecule Polarity",
    topics: ["intermolecular-interactions", "periodic-trends"],
  },
  {
    id: "states-of-matter",
    title: "States of Matter",
    topics: ["intermolecular-interactions", "one-component-systems", "gibbs-phase-rule"],
  },
  { id: "ph-scale", title: "pH Scale", topics: ["acid-base-redox-solubility", "water-chemistry"] },
  {
    id: "greenhouse-effect",
    title: "The Greenhouse Effect",
    topics: ["climate-change-ozone", "air-pollution"],
  },
  {
    id: "natural-selection",
    title: "Natural Selection",
    topics: ["population-growth", "biodiversity-levels", "threats-to-biodiversity"],
  },
  { id: "under-pressure", title: "Under Pressure", topics: ["fluid-pressure-manometers"] },
  { id: "buoyancy", title: "Buoyancy", topics: ["buoyancy-stability"] },
  { id: "density", title: "Density", topics: ["phase-relations-soil", "viscosity-newton"] },
  { id: "hookes-law", title: "Hooke's Law", topics: ["hookes-law-bars", "springs-design"] },
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
  const ids = visualTopicIds(topicId);
  return phetSims.filter((s) => ids.some((t) => s.topics.includes(t)));
}
