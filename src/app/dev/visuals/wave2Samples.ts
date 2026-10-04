import type { VisualSpec } from "@/lib/schema";

const w = (widget: string, params: Record<string, unknown>, caption: string): VisualSpec => ({
  type: "widget",
  widget,
  params,
  caption,
});

/** One example of every Wave 2 widget (V3 · Step 8), grouped by subject, for the gallery. */
export const wave2Samples: { subject: string; visual: VisualSpec }[] = [
  {
    subject: "Data Structures and Algorithms",
    visual: w(
      "stack-queue",
      { mode: "stack", values: [3, 8, 5] },
      "Push and pop: the last value in is the first out.",
    ),
  },
  {
    subject: "Data Structures and Algorithms",
    visual: w(
      "postfix",
      { expression: "3+4*2/(1-5)" },
      "The shunting-yard algorithm converts infix to postfix.",
    ),
  },
  {
    subject: "Data Structures and Algorithms",
    visual: w(
      "linked-list",
      { values: [12, 7, 33] },
      "Insert at the head in O(1); deleting needs the previous node.",
    ),
  },
  {
    subject: "Data Structures and Algorithms",
    visual: w(
      "bst",
      { keys: [50, 30, 70, 20, 40, 60, 80] },
      "In-order traversal of a BST visits keys in sorted order.",
    ),
  },
  {
    subject: "Data Structures and Algorithms",
    visual: w(
      "heap",
      { values: [9, 4, 7, 1, 8] },
      "A min-heap keeps the smallest key at the root.",
    ),
  },
  {
    subject: "Data Structures and Algorithms",
    visual: w(
      "hash-table",
      { keys: [23, 43, 13, 27, 37, 15], size: 10, probe: "linear" },
      "Collisions cluster with linear probing.",
    ),
  },
  {
    subject: "Data Structures and Algorithms",
    visual: w(
      "graph-algorithms",
      { algorithm: "dijkstra", start: "A" },
      "Dijkstra finalises the nearest unvisited node each step.",
    ),
  },
  {
    subject: "Data Structures and Algorithms",
    visual: w(
      "knapsack-dp",
      { weights: [1, 3, 4, 5], values: [1, 4, 5, 7], capacity: 7 },
      "Each cell is the best value using the first i items and capacity w.",
    ),
  },
  {
    subject: "Discrete Mathematics",
    visual: w(
      "truth-table",
      { formula: "(p -> q) <-> (!q -> !p)" },
      "An implication and its contrapositive are equivalent.",
    ),
  },
  {
    subject: "Discrete Mathematics",
    visual: w(
      "venn-count",
      { a: 20, b: 15, c: 10, ab: 5, bc: 4, ac: 3, abc: 2 },
      "Add the sets, subtract the overlaps, add back the triple overlap.",
    ),
  },
  {
    subject: "Discrete Mathematics",
    visual: w(
      "combinatorics",
      { n: 6, r: 3 },
      "Choosing 3 of 6: order matters for permutations, not for combinations.",
    ),
  },
  {
    subject: "Computer Organisation",
    visual: w(
      "number-format",
      { value: -6.5, bits: 8 },
      "Two's complement for integers; IEEE 754 for real numbers.",
    ),
  },
  {
    subject: "Computer Organisation",
    visual: w(
      "booth",
      { multiplicand: 3, multiplier: -4, bits: 4 },
      "Booth's algorithm multiplies signed numbers by add/subtract and shift.",
    ),
  },
  {
    subject: "Computer Organisation",
    visual: w(
      "cache-sim",
      { addresses: [0, 4, 8, 64, 0, 132, 4, 68], cacheBytes: 64, blockBytes: 16, ways: 1 },
      "Direct mapping: blocks that share a set evict each other.",
    ),
  },
  {
    subject: "Computer Organisation",
    visual: w("pipeline", { instructions: 5, stallAfter: 1 }, "A data hazard stalls the pipeline."),
  },
  {
    subject: "Operating Systems",
    visual: w(
      "cpu-scheduler",
      {
        processes: [
          { id: "P1", arrival: 0, burst: 6 },
          { id: "P2", arrival: 1, burst: 3 },
          { id: "P3", arrival: 2, burst: 1 },
          { id: "P4", arrival: 3, burst: 4 },
        ],
        algorithm: "rr",
        quantum: 2,
      },
      "Round robin shares the CPU in time slices.",
    ),
  },
  {
    subject: "Operating Systems",
    visual: w(
      "page-replacement",
      { references: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2], frames: 3, algorithm: "lru" },
      "LRU evicts the page unused for the longest time.",
    ),
  },
  {
    subject: "Operating Systems",
    visual: w(
      "bankers",
      {
        available: [3, 3, 2],
        max: [
          [7, 5, 3],
          [3, 2, 2],
          [9, 0, 2],
          [2, 2, 2],
          [4, 3, 3],
        ],
        allocation: [
          [0, 1, 0],
          [2, 0, 0],
          [3, 0, 2],
          [2, 1, 1],
          [0, 0, 2],
        ],
      },
      "The classic five-process example has a safe sequence.",
    ),
  },
  {
    subject: "Operating Systems",
    visual: w(
      "disk-scheduler",
      { requests: [98, 183, 37, 122, 14, 124, 65, 67], head: 53, algorithm: "sstf" },
      "SSTF serves the nearest request next.",
    ),
  },
  {
    subject: "Computer Networks",
    visual: w("subnet", { ip: "192.168.10.77", prefix: 26 }, "A /26 has 62 usable hosts."),
  },
  {
    subject: "Computer Networks",
    visual: w(
      "crc",
      { data: "1101011011", generator: "10011" },
      "The remainder of modulo-2 division is the CRC.",
    ),
  },
  {
    subject: "Computer Networks",
    visual: w(
      "tcp-congestion",
      { ssthresh: 16, lossRound: 9 },
      "Slow start doubles the window; a loss halves it.",
    ),
  },
  {
    subject: "Computer Networks",
    visual: w(
      "arq-window",
      { frames: 8, window: 4, lostFrame: 2 },
      "Go-Back-N resends everything after a lost frame.",
    ),
  },
  {
    subject: "Database Management Systems",
    visual: w("sql-join", { kind: "left" }, "A LEFT JOIN keeps every row of the left table."),
  },
  {
    subject: "Database Management Systems",
    visual: w(
      "fd-closure",
      { attributes: "ABCD", dependencies: "A->B, B->C, C->D" },
      "A transitive chain from the key breaks 3NF.",
    ),
  },
  {
    subject: "Database Management Systems",
    visual: w(
      "precedence-graph",
      { schedule: "R1(x) W2(x) W1(x)" },
      "A cycle in the precedence graph means not conflict-serializable.",
    ),
  },
  {
    subject: "Theory of Computation",
    visual: w(
      "dfa-sim",
      { machine: "div-by-3", input: "110" },
      "A DFA tracks the remainder mod 3 bit by bit.",
    ),
  },
  {
    subject: "Theory of Computation",
    visual: w(
      "turing-increment",
      { input: "1011" },
      "The machine turns trailing 1s into 0s and the first 0 into a 1.",
    ),
  },
  {
    subject: "Theory of Computation",
    visual: w(
      "pda-brackets",
      { input: "([]{})" },
      "A stack remembers which brackets are still open.",
    ),
  },
  {
    subject: "Compiler Design",
    visual: w(
      "lexer",
      { source: "int count = x + 42;" },
      "The lexer turns characters into tokens.",
    ),
  },
  {
    subject: "Compiler Design",
    visual: w(
      "three-address",
      { statement: "a = b + c * (d - e)" },
      "Each instruction has at most one operator.",
    ),
  },
  {
    subject: "Object-Oriented Programming",
    visual: w(
      "dispatch-explorer",
      {},
      "The object's real class decides which overriding method runs.",
    ),
  },
  {
    subject: "Object-Oriented Programming",
    visual: w("object-references", {}, "An object no variable refers to is garbage."),
  },
  {
    subject: "Software Engineering",
    visual: w("cocomo", { kloc: 32, mode: "organic" }, "Effort grows a little faster than size."),
  },
  {
    subject: "Software Engineering",
    visual: w(
      "cyclomatic",
      { program: "if-in-loop" },
      "V(G) is the number of independent paths to test.",
    ),
  },
  {
    subject: "Software Engineering",
    visual: w("function-points", {}, "Function points measure size from what the user sees."),
  },
  {
    subject: "Web Technologies",
    visual: w(
      "http-explorer",
      { method: "GET", status: 404 },
      "4xx codes mean the client asked for something wrong.",
    ),
  },
  {
    subject: "Web Technologies",
    visual: w(
      "dom-tree",
      { html: "<div><h1>Notes</h1><ul><li>Unit 1</li><li>Unit 2</li></ul></div>" },
      "The browser turns HTML into a tree of nodes.",
    ),
  },
  {
    subject: "Web Technologies",
    visual: w(
      "box-model",
      { content: 200, padding: 16, border: 4, margin: 20 },
      "Width adds content, padding, border and margin.",
    ),
  },
  {
    subject: "AI and ML",
    visual: w(
      "gradient-descent",
      { learningRate: 0.03 },
      "Each step moves the line downhill on the cost.",
    ),
  },
  {
    subject: "AI and ML",
    visual: w(
      "k-means",
      { k: 3 },
      "Assign points to the nearest centroid, then move each centroid to the mean.",
    ),
  },
  {
    subject: "AI and ML",
    visual: w(
      "grid-search",
      { heuristic: true },
      "A heuristic lets A* skip cells that lead away from the goal.",
    ),
  },
  {
    subject: "AI and ML",
    visual: w("entropy", { yes: 9, no: 5 }, "A good split lowers the entropy of the branches."),
  },
  {
    subject: "Digital Logic Design",
    visual: w(
      "kmap",
      { variables: 4, minterms: [0, 2, 8, 10] },
      "The four corners group into B'D'.",
    ),
  },
  {
    subject: "Digital Logic Design",
    visual: w("flip-flop", { type: "JK" }, "With J = K = 1 a JK flip-flop toggles."),
  },
  {
    subject: "Digital Logic Design",
    visual: w("counter", { bits: 3, kind: "johnson" }, "A 3-bit Johnson counter has 6 states."),
  },
  {
    subject: "Signals and Systems",
    visual: w("convolution", { x: [1, 2, 3], h: [1, 1, 0.5] }, "Flip, shift, multiply and add."),
  },
  {
    subject: "Signals and Systems",
    visual: w(
      "sampling",
      { signalHz: 9, sampleHz: 12 },
      "Sampling below twice the signal frequency aliases.",
    ),
  },
  {
    subject: "Signals and Systems",
    visual: w(
      "pole-zero",
      { domain: "z", poles: [{ re: 0.6, im: 0.5 }], zeros: [{ re: -1, im: 0 }] },
      "Poles near the unit circle make a resonant peak.",
    ),
  },
  {
    subject: "Network Theory",
    visual: w(
      "rlc-resonance",
      { resistance: 20, inductanceMh: 10, capacitanceUf: 1 },
      "At resonance the reactances cancel and the current peaks.",
    ),
  },
  {
    subject: "Network Theory",
    visual: w(
      "max-power",
      { sourceV: 12, sourceR: 8 },
      "Maximum power when the load equals the source resistance.",
    ),
  },
  {
    subject: "Analog Electronics",
    visual: w(
      "amp-bode",
      { midGainDb: 40, lowCutHz: 50, highCutHz: 200000 },
      "Gain is flat between the two −3 dB frequencies.",
    ),
  },
  {
    subject: "Analog Electronics",
    visual: w(
      "diff-amp",
      { ad: 1000, acm: 0.05 },
      "A high CMRR rejects noise common to both inputs.",
    ),
  },
  {
    subject: "Analog Electronics",
    visual: w(
      "adc-dac",
      { bits: 8, vref: 5, vin: 3.3 },
      "A SAR ADC decides one bit per clock, MSB first.",
    ),
  },
  {
    subject: "Communication Systems",
    visual: w("modulation", { kind: "am", index: 0.6 }, "The envelope of AM follows the message."),
  },
  {
    subject: "Communication Systems",
    visual: w("pcm", { bits: 3 }, "Each extra bit adds about 6 dB of SQNR."),
  },
  {
    subject: "Communication Systems",
    visual: w(
      "constellation",
      { scheme: "QPSK", noise: 0.25 },
      "Noise spreads the received points around each symbol.",
    ),
  },
  {
    subject: "Digital Signal Processing",
    visual: w(
      "dft-spectrum",
      { f1: 5.5, f2: 12 },
      "A tone between bins leaks into its neighbours.",
    ),
  },
  {
    subject: "Digital Signal Processing",
    visual: w("fir-design", { taps: 31, cutoff: 0.15 }, "More taps make a sharper transition."),
  },
  {
    subject: "Digital Signal Processing",
    visual: w(
      "iir-response",
      { type: "butterworth", order: 4 },
      "Butterworth is maximally flat in the passband.",
    ),
  },
  {
    subject: "Microprocessors",
    visual: w(
      "segment-address",
      { segment: 4096, offset: 32 },
      "Physical address = segment × 16 + offset.",
    ),
  },
  {
    subject: "Microprocessors",
    visual: w("address-decoder", { chipKb: 4, chips: 4 }, "High address lines choose the chip."),
  },
  {
    subject: "Microprocessors",
    visual: w(
      "accumulator-machine",
      { program: "multiply" },
      "A loop of ADD and DCR multiplies by repeated addition.",
    ),
  },
  {
    subject: "Electromagnetic Theory",
    visual: w(
      "transmission-line",
      { loadOhms: 100, z0: 50 },
      "A mismatched load makes a standing wave; VSWR measures it.",
    ),
  },
  {
    subject: "Electromagnetic Theory",
    visual: w(
      "polarisation",
      { ex: 1, ey: 1, phaseDeg: 90 },
      "Equal amplitudes 90° apart give circular polarisation.",
    ),
  },
  {
    subject: "Electromagnetic Theory",
    visual: w(
      "waveguide",
      { widthMm: 22.86, heightMm: 10.16 },
      "WR-90: TE10 is the only mode from about 6.6 to 13 GHz.",
    ),
  },
  {
    subject: "Electromagnetic Theory",
    visual: w("skin-depth", {}, "At high frequencies current flows in a thin surface layer."),
  },
  {
    subject: "VLSI Design",
    visual: w(
      "mosfet-iv",
      { vth: 0.7, k: 1 },
      "Triode at low V_DS, saturation once V_DS > V_GS − V_th.",
    ),
  },
  {
    subject: "VLSI Design",
    visual: w("cmos-inverter", { vdd: 3.3 }, "Equal-strength transistors switch at V_DD/2."),
  },
  {
    subject: "VLSI Design",
    visual: w(
      "cmos-power",
      { capacitancePf: 10, voltage: 1.2, frequencyMhz: 1000, activity: 0.1 },
      "Power falls with the square of the supply voltage.",
    ),
  },
];
