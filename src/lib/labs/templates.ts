import { findPhetSim } from "@/data/phet";
import { hits, normal } from "@/lib/labs/text";
import { widgetRegistry, type WidgetId } from "@/visuals/registry";

/*
 * Which simulation templates suit an experiment (syllabus fix, Phase 7B). A rule-based shortlist
 * from the experiment's words keeps the AI's choice small and on-topic: it may only pick one of
 * these (or none). Templates are registry widgets (checked parameters) or PhET simulations.
 */

export type LabTemplate =
  | { kind: "widget"; id: WidgetId; keywords: readonly string[] }
  | { kind: "phet"; id: string; keywords: readonly string[] };

const w = (id: WidgetId, ...keywords: string[]): LabTemplate => ({ kind: "widget", id, keywords });
const p = (id: string, ...keywords: string[]): LabTemplate => ({ kind: "phet", id, keywords });

/** Every template a lab lesson may use, with the words that point to it. */
export const LAB_TEMPLATES: readonly LabTemplate[] = [
  w(
    "newton-rings",
    "newton's ring",
    "newtons ring",
    "newton ring",
    "radius of curvature of a lens",
  ),
  w("hall-effect", "hall effect", "hall voltage", "hall coefficient", "hall probe"),
  w("hysteresis", "hysteresis", "b-h curve", "bh curve", "b-h loop", "retentivity", "coercivity"),
  w("em-thomson", "e/m", "thomson", "specific charge", "charge to mass"),
  w(
    "coil-field",
    "coil",
    "helmholtz",
    "biot",
    "savart",
    "bio-savart",
    "biot-savart",
    "tangent galvanometer",
    "magnetic field along",
  ),
  w("thin-lens", "lens", "focal length", "mirror", "optical bench", "magnification"),
  w(
    "oscillation",
    "pendulum",
    "spring constant",
    "acceleration due to gravity",
    "oscillation",
    "bar pendulum",
    "hooke",
  ),
  w(
    "titration",
    "titration",
    "titrate",
    "acidity",
    "alkalinity",
    "neutralis",
    "neutraliz",
    "normality",
    "acid value",
    "saponification value",
  ),
  w(
    "heat-exchanger",
    "heat exchanger",
    "parallel flow",
    "counter flow",
    "shell and tube",
    "double pipe",
    "lmtd",
  ),
  w(
    "flow-meter",
    "venturi",
    "orifice",
    "flow meter",
    "flowmeter",
    "coefficient of discharge",
    "bernoulli",
  ),
  w("oscilloscope", "cro", "oscilloscope", "lissajous", "dso", "function generator"),
  w(
    "dc-circuit",
    "ohm",
    "resistance",
    "kirchhoff",
    "series and parallel",
    "potentiometer",
    "wheatstone",
    "meter bridge",
    "superposition",
    "thevenin",
    "norton",
  ),
  w("max-power", "maximum power transfer"),
  w("rlc-resonance", "resonance", "rlc", "series resonant", "parallel resonant"),
  w(
    "first-order-transient",
    "charging and discharging",
    "rc circuit",
    "rl circuit",
    "time constant",
    "transient",
  ),
  w(
    "diode-rectifier",
    "diode",
    "rectifier",
    "zener",
    "half wave",
    "full wave",
    "bridge rectifier",
    "clipper",
    "clamper",
  ),
  w("load-line", "transistor", "bjt", "biasing", "common emitter", "characteristics of transistor"),
  w(
    "op-amp",
    "op-amp",
    "op amp",
    "operational amplifier",
    "inverting",
    "non-inverting",
    "integrator",
    "differentiator",
  ),
  w("amp-bode", "frequency response", "amplifier", "bandwidth"),
  w(
    "logic-gates",
    "logic gate",
    "gates",
    "half adder",
    "full adder",
    "universal gate",
    "nand",
    "nor",
  ),
  w("kmap", "k-map", "karnaugh", "boolean", "minimi"),
  w("flip-flop", "flip-flop", "flip flop", "latch"),
  w("counter", "counter", "shift register"),
  w("adc-dac", "adc", "dac", "analog to digital", "digital to analog"),
  w(
    "modulation",
    "amplitude modulation",
    "frequency modulation",
    "am signal",
    "fm signal",
    "demodulation",
    "ssb",
    "dsb",
  ),
  w("sampling", "sampling", "aliasing", "nyquist"),
  w("pcm", "pcm", "pulse code", "quantis", "quantiz", "delta modulation"),
  w("constellation", "ask", "fsk", "psk", "bpsk", "qpsk", "qam", "digital modulation"),
  w("dft-spectrum", "fft", "dft", "spectrum"),
  w("fir-design", "fir filter", "fir"),
  w("iir-response", "iir", "butterworth", "chebyshev"),
  w("convolution", "convolution", "correlation"),
  w("transformer", "transformer", "open circuit test", "short circuit test", "turns ratio"),
  w("torque-slip", "induction motor", "slip", "torque speed", "blocked rotor", "no load test"),
  w("three-phase", "three phase", "3 phase", "star", "delta", "two wattmeter"),
  w("ac-wave", "ac circuit", "power factor", "phasor", "rms"),
  w("transmission-line", "transmission line", "standing wave ratio", "vswr"),
  w("mosfet-iv", "mosfet", "fet characteristics", "jfet"),
  w("cmos-inverter", "cmos inverter", "cmos"),
  w(
    "slit-pattern",
    "diffraction",
    "grating",
    "single slit",
    "double slit",
    "interference",
    "young",
  ),
  w("standing-wave", "sonometer", "melde", "stationary wave", "standing wave", "resonance tube"),
  w(
    "beer-lambert",
    "spectrophotometer",
    "colorimeter",
    "colorimetric",
    "absorbance",
    "beer",
    "lambert",
    "uv-vis",
    "uv visible",
  ),
  w(
    "nernst-cell",
    "electrode potential",
    "emf of",
    "galvanic",
    "nernst",
    "potentiometric",
    "electrochemical cell",
  ),
  w("oscillator", "damped", "forced vibration", "vibration"),
  w("incline-friction", "friction", "inclined plane", "angle of repose"),
  w(
    "force-resultant",
    "forces",
    "law of forces",
    "polygon of forces",
    "parallelogram",
    "jib crane",
  ),
  w("projectile", "projectile"),
  w(
    "sort-stepper",
    "sorting",
    "bubble sort",
    "insertion sort",
    "merge sort",
    "quick sort",
    "selection sort",
  ),
  w("binary-search", "binary search", "searching", "linear search"),
  w("stack-queue", "stack", "queue"),
  w("postfix", "infix", "postfix", "prefix expression"),
  w("linked-list", "linked list"),
  w("bst", "binary search tree", "bst", "tree traversal"),
  w("heap", "heap", "priority queue"),
  w("hash-table", "hashing", "hash table"),
  w(
    "graph-algorithms",
    "bfs",
    "dfs",
    "dijkstra",
    "kruskal",
    "prim",
    "shortest path",
    "spanning tree",
    "graph traversal",
  ),
  w("knapsack-dp", "knapsack", "dynamic programming"),
  w("recursion-tree", "recursion", "recursive", "factorial", "fibonacci"),
  w("cpu-scheduler", "cpu scheduling", "fcfs", "round robin", "sjf", "scheduling algorithm"),
  w("page-replacement", "page replacement", "lru", "fifo"),
  w("bankers", "banker", "deadlock"),
  w("disk-scheduler", "disk scheduling", "scan", "sstf"),
  w("subnet", "subnet", "ip address", "ipv4", "cidr"),
  w("crc", "crc", "error detection", "checksum", "hamming"),
  w("arq-window", "sliding window", "go back n", "go-back-n", "selective repeat", "stop and wait"),
  w("tcp-congestion", "congestion"),
  w("sql-join", "sql", "join", "query", "dbms"),
  w("fd-closure", "normalization", "normalisation", "functional dependenc"),
  w("dfa-sim", "dfa", "finite automata", "nfa"),
  w("lexer", "lexical analy", "lex", "token"),
  w("gradient-descent", "linear regression", "gradient descent", "regression"),
  w("k-means", "k-means", "kmeans", "clustering"),
  w("entropy", "decision tree", "information gain", "id3"),
  w("grid-search", "a* search", "best first", "breadth first", "path finding"),
  w("http-explorer", "http", "web server", "client-server", "socket"),
  w("dom-tree", "html", "dom", "javascript"),
  w("box-model", "css"),
  w("accumulator-machine", "8085", "assembly language", "microprocessor"),
  w("segment-address", "8086"),
  w("orthographic-views", "orthographic", "projection of solids", "isometric"),
  w("phase-diagram", "phase diagram", "triple point"),
  p("pendulum-lab", "pendulum"),
  p("masses-and-springs", "spring", "hooke"),
  p("hookes-law", "hooke", "spring constant"),
  p(
    "bending-light",
    "refraction",
    "refractive index",
    "prism",
    "snell",
    "total internal reflection",
  ),
  p("wave-interference", "interference", "diffraction", "young"),
  p(
    "circuit-construction-kit-dc",
    "ohm",
    "kirchhoff",
    "resistance",
    "series and parallel",
    "circuit",
  ),
  p("circuit-construction-kit-ac", "ac circuit", "rlc", "inductor", "capacitor"),
  p("capacitor-lab-basics", "capacitor", "capacitance", "dielectric"),
  p("faradays-law", "faraday", "induction", "induced emf"),
  p("magnets-and-electromagnets", "electromagnet", "magnet"),
  p("beers-law-lab", "beer", "absorbance", "concentration", "spectrophotometer", "colorimeter"),
  p("ph-scale", "ph meter", "ph of", "acid", "base", "buffer"),
  p("gas-properties", "gas law", "ideal gas", "boyle", "charles"),
  p("under-pressure", "pressure", "hydrostatic", "manometer"),
  p("buoyancy", "buoyancy", "archimedes", "floating", "metacentric"),
  p("density", "density", "specific gravity"),
  p("energy-forms-and-changes", "energy conversion", "heat transfer", "conduction"),
  p("states-of-matter", "melting", "boiling", "states of matter"),
  p("blackbody-spectrum", "black body", "blackbody", "stefan", "planck"),
  p("models-of-the-hydrogen-atom", "hydrogen spectrum", "rydberg", "atomic spectra"),
];

export type Shortlisted = LabTemplate & { score: number };

/**
 * The templates that fit an experiment, best first (at most `limit`). The title counts double:
 * the course name only breaks ties (a "Physics lab" alone says little).
 */
export function shortlistTemplates(
  experiment: { name: string; aim?: string },
  courseName = "",
  limit = 5,
): Shortlisted[] {
  const title = normal(`${experiment.name} ${experiment.aim ?? ""}`);
  const course = normal(courseName);
  return LAB_TEMPLATES.flatMap((t) => {
    const own = t.keywords.filter((k) => hits(title, k));
    if (own.length === 0) return [];
    // Longer phrases are more telling than single short words.
    const score =
      own.reduce((sum, k) => sum + 2 + Math.min(3, k.split(" ").length - 1), 0) +
      t.keywords.filter((k) => hits(course, k)).length * 0.25 +
      (t.kind === "widget" ? 0.5 : 0);
    return [{ ...t, score }];
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** The prompt lines describing a shortlist: what each template is and its parameters. */
export function templatePromptLines(shortlist: readonly LabTemplate[]): string {
  return shortlist
    .map((t) =>
      t.kind === "widget"
        ? `- {"type":"widget","widget":"${t.id}","params":{...}}: ${widgetRegistry[t.id].name}. Params: ${widgetRegistry[t.id].help}`
        : `- {"type":"phet","sim":"${t.id}"}: PhET simulation "${findPhetSim(t.id)?.title ?? t.id}" (no params).`,
    )
    .join("\n");
}

/** True when a chosen simulation is one of the shortlisted templates. */
export function inShortlist(
  shortlist: readonly LabTemplate[],
  choice: { type: string; widget?: string; sim?: string },
): boolean {
  return shortlist.some((t) =>
    t.kind === "widget"
      ? choice.type === "widget" && choice.widget === t.id
      : choice.type === "phet" && choice.sim === t.id,
  );
}
