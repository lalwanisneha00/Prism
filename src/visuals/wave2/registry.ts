import { z } from "zod";
import { HTTP_STATUS } from "@/visuals/wave2/theoryModels";

/*
 * Wave 2 widgets (V3 · Step 8): parameters (checked before drawing), the help line the AI
 * sees, and the exact topics each fits. Spread into widgetRegistry in ../registry.ts.
 */

const num = (min: number, max: number) => z.number().min(min).max(max);
const int = (min: number, max: number) => z.int().min(min).max(max);
const text = (max: number) => z.string().trim().min(1).max(max);
const complex = z.object({ re: num(-3, 3), im: num(-3, 3) });

export const wave2Widgets = {
  "stack-queue": {
    name: "Stack / queue operations",
    params: z.object({ mode: z.enum(["stack", "queue"]), values: z.array(int(0, 99)).max(8) }),
    help: 'mode "stack" or "queue"; values: up to 8 starting integers (0..99).',
    topics: ["stack-adt", "queue-types", "linked-stack-queue", "abstract-data-types"],
  },
  postfix: {
    name: "Infix to postfix with a stack",
    params: z.object({ expression: text(60).regex(/^[\d\sA-Za-z+\-*/^().]+$/) }),
    help: 'expression: an infix expression of numbers or letters with + - * / ^ ( ), e.g. "3+4*2/(1-5)".',
    topics: ["expression-conversion", "stack-adt"],
  },
  "linked-list": {
    name: "Singly linked list",
    params: z.object({ values: z.array(int(0, 99)).max(8) }),
    help: "values: up to 8 integers (0..99) in the starting list.",
    topics: [
      "singly-linked-list",
      "doubly-circular-lists",
      "self-referential-linked-list",
      "pointers",
    ],
  },
  bst: {
    name: "Binary search tree",
    params: z.object({ keys: z.array(int(1, 99)).min(1).max(12) }),
    help: "keys: 1-12 integers (1..99) inserted in order, e.g. [50,30,70,20,40,60,80].",
    topics: ["binary-search-tree", "binary-tree-traversal", "avl-tree", "trees-prefix-codes"],
  },
  heap: {
    name: "Binary min-heap",
    params: z.object({ values: z.array(int(0, 99)).max(12) }),
    help: "values: up to 12 integers (0..99) inserted to start.",
    topics: ["heap-structure", "heap-sort", "queue-types"],
  },
  "hash-table": {
    name: "Hash table with collision handling",
    params: z.object({
      keys: z.array(int(0, 999)).min(1).max(12),
      size: int(5, 13),
      probe: z.enum(["linear", "quadratic", "chaining"]),
    }),
    help: 'keys: 1-12 integers; size: table size 5..13 (prime is best); probe "linear", "quadratic" or "chaining".',
    topics: ["hashing", "indexing"],
  },
  "graph-algorithms": {
    name: "Graph algorithms: BFS, DFS, Dijkstra, Kruskal",
    params: z.object({
      algorithm: z.enum(["bfs", "dfs", "dijkstra", "kruskal"]),
      start: z.enum(["A", "B", "C", "D", "E", "F"]),
    }),
    help: 'algorithm "bfs", "dfs", "dijkstra" or "kruskal" on a fixed 6-node weighted graph; start node "A".."F".',
    topics: [
      "bfs-dfs",
      "graph-representation",
      "shortest-paths",
      "minimum-spanning-tree",
      "topological-sort",
      "uninformed-search",
      "graph-basics",
      "routing-algorithms",
      "greedy-algorithms",
    ],
  },
  "knapsack-dp": {
    name: "0/1 knapsack dynamic-programming table",
    params: z
      .object({
        weights: z.array(int(1, 10)).min(1).max(6),
        values: z.array(int(1, 50)).min(1).max(6),
        capacity: int(1, 12),
      })
      .refine((p) => p.weights.length === p.values.length, {
        message: "weights and values must be the same length",
      }),
    help: "weights and values: arrays of the same length (1-6 items); capacity 1..12.",
    topics: ["dynamic-programming", "backtracking-branch-bound"],
  },
  "truth-table": {
    name: "Truth table of a formula",
    params: z.object({ formula: text(60).regex(/^[pqr\s!&|()<>-]+$/) }),
    help: 'formula in p, q, r using ! (not), & (and), | (or), -> (implies), <-> (iff), e.g. "(p -> q) <-> (!q -> !p)".',
    topics: [
      "propositional-logic",
      "logical-equivalence",
      "rules-of-inference",
      "boolean-algebra-dm",
      "first-order-logic",
    ],
  },
  "venn-count": {
    name: "Inclusion–exclusion with three sets",
    params: z.object({
      a: int(0, 50),
      b: int(0, 50),
      c: int(0, 50),
      ab: int(0, 50),
      bc: int(0, 50),
      ac: int(0, 50),
      abc: int(0, 50),
    }),
    help: "a, b, c: set sizes; ab, bc, ac: pairwise intersections; abc: triple intersection (all 0..50).",
    topics: ["inclusion-exclusion", "set-operations"],
  },
  combinatorics: {
    name: "Permutations and combinations",
    params: z.object({ n: int(1, 20), r: int(0, 20) }),
    help: "n items (1..20), r chosen (0..20, ≤ n).",
    topics: ["permutations-combinations", "pigeonhole"],
  },
  "number-format": {
    name: "Two's complement and IEEE 754",
    params: z.object({ value: num(-200, 200), bits: int(4, 16) }),
    help: "value (-200..200, may be fractional for the float); bits for two's complement (4..16).",
    topics: ["signed-numbers", "floating-point", "binary-codes"],
  },
  booth: {
    name: "Booth's multiplication",
    params: z.object({ multiplicand: int(-8, 7), multiplier: int(-8, 7), bits: z.literal(4) }),
    help: "multiplicand and multiplier: 4-bit signed integers (-8..7); bits: 4.",
    topics: ["booth-multiplication", "division-algorithms"],
  },
  "cache-sim": {
    name: "Cache mapping simulator",
    params: z.object({
      addresses: z.array(int(0, 4095)).min(1).max(16),
      cacheBytes: z.union([z.literal(32), z.literal(64), z.literal(128)]),
      blockBytes: z.union([z.literal(4), z.literal(8), z.literal(16)]),
      ways: z.union([z.literal(1), z.literal(2), z.literal(4)]),
    }),
    help: "addresses: 1-16 byte addresses (0..4095); cacheBytes 32/64/128; blockBytes 4/8/16; ways 1/2/4.",
    topics: [
      "cache-mapping",
      "cache-replacement-write",
      "memory-hierarchy",
      "cache-virtual-memory-mp",
    ],
  },
  pipeline: {
    name: "Five-stage instruction pipeline",
    params: z.object({ instructions: int(2, 8), stallAfter: int(0, 3) }),
    help: "instructions 2..8; stallAfter: stall cycles on instruction 2 for a data hazard (0..3).",
    topics: ["instruction-pipelining", "pipeline-hazards", "risc", "instruction-scheduling"],
  },
  "cpu-scheduler": {
    name: "CPU scheduling Gantt chart",
    params: z.object({
      processes: z
        .array(z.object({ id: text(4), arrival: int(0, 20), burst: int(1, 12) }))
        .min(2)
        .max(6),
      algorithm: z.enum(["fcfs", "sjf", "rr"]),
      quantum: int(1, 6),
    }),
    help: 'processes: 2-6 of {id: "P1", arrival 0..20, burst 1..12}; algorithm "fcfs", "sjf" or "rr"; quantum 1..6.',
    topics: [
      "fcfs-sjf",
      "round-robin",
      "scheduling-criteria",
      "real-time-scheduling",
      "context-switch",
    ],
  },
  "page-replacement": {
    name: "Page replacement: FIFO, LRU, optimal",
    params: z.object({
      references: z.array(int(0, 9)).min(4).max(20),
      frames: int(1, 6),
      algorithm: z.enum(["fifo", "lru", "optimal"]),
    }),
    help: 'references: 4-20 page numbers (0..9); frames 1..6; algorithm "fifo", "lru" or "optimal".',
    topics: ["page-replacement", "virtual-memory", "paging", "cache-replacement-write"],
  },
  bankers: {
    name: "Banker's algorithm safety check",
    params: z
      .object({
        available: z.array(int(0, 20)).min(1).max(4),
        max: z
          .array(z.array(int(0, 20)).min(1).max(4))
          .min(2)
          .max(6),
        allocation: z
          .array(z.array(int(0, 20)).min(1).max(4))
          .min(2)
          .max(6),
      })
      .refine(
        (p) =>
          p.max.length === p.allocation.length &&
          p.max.every(
            (r, i) =>
              r.length === p.available.length &&
              p.allocation[i].length === r.length &&
              r.every((m, j) => m >= p.allocation[i][j]),
          ),
        { message: "max and allocation must have matching shapes, with allocation ≤ max" },
      ),
    help: "available: free count per resource type; max and allocation: one row per process (same lengths), allocation ≤ max.",
    topics: ["bankers-algorithm", "deadlock-conditions", "deadlock-detection"],
  },
  "disk-scheduler": {
    name: "Disk scheduling: FCFS, SSTF, SCAN",
    params: z.object({
      requests: z.array(int(0, 199)).min(2).max(10),
      head: int(0, 199),
      algorithm: z.enum(["fcfs", "sstf", "scan"]),
    }),
    help: 'requests: 2-10 cylinder numbers (0..199); head start 0..199; algorithm "fcfs", "sstf" or "scan".',
    topics: ["disk-scheduling", "file-systems"],
  },
  subnet: {
    name: "IPv4 subnet calculator",
    params: z.object({ ip: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}$/), prefix: int(8, 32) }),
    help: 'ip: an IPv4 address like "192.168.10.77"; prefix 8..32.',
    topics: ["ipv4-addressing", "ipv6", "arp-dhcp"],
  },
  crc: {
    name: "CRC by modulo-2 division",
    params: z.object({
      data: z.string().regex(/^[01]{1,16}$/),
      generator: z.string().regex(/^1[01]{1,7}$/),
    }),
    help: 'data: up to 16 bits; generator: polynomial bits starting with 1, e.g. "10011".',
    topics: ["error-detection"],
  },
  "tcp-congestion": {
    name: "TCP congestion window",
    params: z.object({ ssthresh: int(2, 32), lossRound: int(0, 20) }),
    help: "ssthresh: initial threshold (2..32); lossRound: round with a loss (0 = none, 1..20).",
    topics: ["congestion-control", "tcp"],
  },
  "arq-window": {
    name: "Go-Back-N vs Selective Repeat",
    params: z.object({ frames: int(4, 12), window: int(1, 8), lostFrame: int(0, 11) }),
    help: "frames 4..12; window size 1..8; lostFrame: index of the frame lost once (< frames).",
    topics: ["flow-control-arq", "sliding-window", "tcp"],
  },
  "sql-join": {
    name: "SQL joins on two tables",
    params: z.object({ kind: z.enum(["inner", "left", "right", "full"]) }),
    help: 'kind "inner", "left", "right" or "full" (fixed small Employee and Department tables).',
    topics: ["sql-joins-aggregates", "relational-algebra", "sql-basics"],
  },
  "fd-closure": {
    name: "Functional dependencies, keys and normal forms",
    params: z.object({ attributes: z.string().regex(/^[A-H]{2,8}$/), dependencies: text(120) }),
    help: 'attributes: letters like "ABCD"; dependencies like "A->B, B->C, CD->A".',
    topics: ["functional-dependencies", "normal-forms", "keys", "lossless-dependency-preserving"],
  },
  "precedence-graph": {
    name: "Conflict serializability (precedence graph)",
    params: z.object({ schedule: z.string().regex(/^([RW]\d\([a-z]\)\s*){2,16}$/i) }),
    help: 'schedule: operations like "R1(x) W2(x) R2(y) W1(y)" (R/W, transaction number, item).',
    topics: ["serializability", "locking-2pl", "acid", "timestamp-mvcc"],
  },
  "dfa-sim": {
    name: "DFA simulator",
    params: z.object({
      machine: z.enum(["even-zeros", "ends-01", "div-by-3"]),
      input: z.string().regex(/^[01]{0,16}$/),
    }),
    help: 'machine "even-zeros", "ends-01" or "div-by-3"; input: a string of 0s and 1s.',
    topics: [
      "dfa",
      "nfa",
      "regular-expressions",
      "dfa-minimisation",
      "lexical-analysis-tokens",
      "finite-state-machines",
      "alphabets-languages",
    ],
  },
  "turing-increment": {
    name: "Turing machine (binary increment)",
    params: z.object({ input: z.string().regex(/^[01]{1,10}$/) }),
    help: "input: a binary number (1-10 bits).",
    topics: ["turing-machine", "church-turing", "decidability"],
  },
  "pda-brackets": {
    name: "Pushdown automaton for balanced brackets",
    params: z.object({ input: z.string().regex(/^[()[\]{}]{1,20}$/) }),
    help: 'input: brackets only, e.g. "([]{})".',
    topics: ["pda", "cfg", "chomsky-hierarchy", "top-down-parsing"],
  },
  lexer: {
    name: "Lexical analyser",
    params: z.object({ source: text(80) }),
    help: 'source: a line of C-like code, e.g. "int count = x + 42;".',
    topics: ["lexical-analysis-tokens", "regex-to-automata", "compiler-phases"],
  },
  "three-address": {
    name: "Three-address code generator",
    params: z.object({ statement: z.string().regex(/^\s*[A-Za-z_]\w*\s*=\s*[\w\s+\-*/()]+$/) }),
    help: 'statement: an assignment like "a = b + c * (d - e)".',
    topics: [
      "three-address-code",
      "syntax-directed-translation",
      "code-optimisation",
      "register-allocation",
    ],
  },
  "dispatch-explorer": {
    name: "Polymorphism and dynamic dispatch",
    params: z.object({}),
    help: "no parameters: the student picks the declared type and the object created.",
    topics: [
      "polymorphism",
      "inheritance",
      "abstract-classes-interfaces",
      "composition-vs-inheritance",
    ],
  },
  "object-references": {
    name: "References, aliasing and garbage collection",
    params: z.object({}),
    help: "no parameters: the student points two variables at objects and sees which become garbage.",
    topics: ["memory-management-oop", "classes-objects", "encapsulation"],
  },
  cocomo: {
    name: "Basic COCOMO estimator",
    params: z.object({ kloc: num(1, 500), mode: z.enum(["organic", "semi-detached", "embedded"]) }),
    help: 'kloc: size in thousands of lines (1..500); mode "organic", "semi-detached" or "embedded".',
    topics: ["cocomo", "risk-management"],
  },
  cyclomatic: {
    name: "Cyclomatic complexity",
    params: z.object({ program: z.enum(["if-else", "while-loop", "if-in-loop", "switch-3"]) }),
    help: 'program: "if-else", "while-loop", "if-in-loop" or "switch-3".',
    topics: ["cyclomatic-complexity", "white-black-box", "testing-levels"],
  },
  "function-points": {
    name: "Function point calculator",
    params: z.object({}),
    help: "no parameters: the student sets the counts and the degree of influence.",
    topics: ["function-points-halstead", "cocomo"],
  },
  "http-explorer": {
    name: "HTTP request and response",
    params: z.object({
      method: z.enum(["GET", "POST", "PUT", "DELETE"]),
      status: int(100, 599).refine((v) => v in HTTP_STATUS, {
        message: "a status code the widget knows",
      }),
    }),
    help: 'method "GET" | "POST" | "PUT" | "DELETE"; status one of 200, 201, 204, 301, 304, 400, 401, 403, 404, 500, 503.',
    topics: [
      "http-protocol",
      "http-www",
      "servlets-lifecycle",
      "sessions-cookies",
      "internet-web-history",
    ],
  },
  "dom-tree": {
    name: "DOM tree of an HTML snippet",
    params: z.object({ html: text(300) }),
    help: 'html: a small well-formed snippet, e.g. "<ul><li>One</li><li>Two</li></ul>".',
    topics: ["dom-sax", "html-basics", "dom-events", "xml-dtd"],
  },
  "box-model": {
    name: "CSS box model",
    params: z.object({
      content: num(40, 240),
      padding: num(0, 40),
      border: num(0, 12),
      margin: num(0, 40),
    }),
    help: "content width 40..240 px; padding 0..40; border 0..12; margin 0..40.",
    topics: ["css"],
  },
  "gradient-descent": {
    name: "Gradient descent for linear regression",
    params: z.object({ learningRate: num(0.001, 0.09) }),
    help: "learningRate: 0.001..0.09 (too large diverges).",
    topics: ["gradient-descent", "linear-regression-ml", "backpropagation", "perceptron"],
  },
  "k-means": {
    name: "k-means clustering",
    params: z.object({ k: int(1, 4) }),
    help: "k: number of clusters (1..4).",
    topics: ["k-means", "types-of-learning"],
  },
  "grid-search": {
    name: "A* vs breadth-first search on a grid",
    params: z.object({ heuristic: z.boolean() }),
    help: "heuristic: true for A* (Manhattan distance), false for breadth-first.",
    topics: ["informed-search", "uninformed-search", "local-search", "intelligent-agents"],
  },
  entropy: {
    name: "Entropy and information gain",
    params: z.object({ yes: int(0, 20), no: int(0, 20) }),
    help: "yes and no: class counts at the parent node (0..20 each).",
    topics: ["decision-trees-id3", "naive-bayes", "overfitting-validation"],
  },
  kmap: {
    name: "Karnaugh map",
    params: z.object({ variables: int(2, 4), minterms: z.array(int(0, 15)).max(16) }),
    help: "variables 2..4; minterms: the indices where F = 1 (each < 2^variables).",
    topics: ["karnaugh-maps", "boolean-sop-pos", "standard-forms-truth-tables"],
  },
  "flip-flop": {
    name: "Flip-flop behaviour",
    params: z.object({ type: z.enum(["SR", "JK", "D", "T"]) }),
    help: 'type "SR", "JK", "D" or "T".',
    topics: ["latches-flip-flops", "latches-flipflops-cmos"],
  },
  counter: {
    name: "Counters and shift-register sequences",
    params: z.object({ bits: int(2, 4), kind: z.enum(["up", "down", "ring", "johnson"]) }),
    help: 'bits 2..4; kind "up", "down", "ring" or "johnson".',
    topics: ["counters", "shift-registers", "prbs-lfsr"],
  },
  convolution: {
    name: "Discrete convolution",
    params: z.object({
      x: z.array(num(-5, 5)).min(1).max(8),
      h: z.array(num(-5, 5)).min(1).max(6),
    }),
    help: "x: input samples (1-8 numbers, -5..5); h: impulse response (1-6 numbers).",
    topics: [
      "convolution",
      "impulse-response",
      "circular-convolution",
      "differential-difference-equations",
    ],
  },
  sampling: {
    name: "Sampling and aliasing",
    params: z.object({ signalHz: num(1, 50), sampleHz: num(5, 120) }),
    help: "signalHz 1..50; sampleHz 5..120 (alias when below 2× the signal).",
    topics: ["sampling-theorem", "aliasing", "reconstruction", "pam-pcm", "multirate"],
  },
  "pole-zero": {
    name: "Poles, zeros and frequency response",
    params: z.object({
      domain: z.enum(["s", "z"]),
      poles: z.array(complex).min(1).max(2),
      zeros: z.array(complex).max(2),
    }),
    help: 'domain "s" or "z"; poles: 1-2 of {re, im} (first one sets the conjugate pair); zeros: 0-2 of {re, im}.',
    topics: [
      "transfer-function-models",
      "bibo-stability",
      "root-locus",
      "laplace-systems",
      "z-transform",
      "frequency-response",
      "transfer-functions",
      "z-transform-dsp",
      "inverse-systems",
      "system-properties",
      "stability-margins",
    ],
  },
  "rlc-resonance": {
    name: "Series RLC resonance",
    params: z.object({
      resistance: num(1, 200),
      inductanceMh: num(0.1, 500),
      capacitanceUf: num(0.01, 100),
    }),
    help: "resistance Ω (1..200); inductanceMh (0.1..500); capacitanceUf (0.01..100).",
    topics: ["series-parallel-resonance", "passive-filters", "laplace-circuits"],
  },
  "max-power": {
    name: "Maximum power transfer",
    params: z.object({ sourceV: num(1, 100), sourceR: num(1, 1000) }),
    help: "sourceV (1..100 V); sourceR: source (Thevenin) resistance (1..1000 Ω).",
    topics: ["max-power-transfer", "thevenin-norton-ac"],
  },
  "amp-bode": {
    name: "Amplifier frequency response",
    params: z.object({
      midGainDb: num(0, 80),
      lowCutHz: num(1, 1000),
      highCutHz: num(2000, 1000000),
    }),
    help: "midGainDb 0..80; lowCutHz 1..1000; highCutHz 2000..1000000.",
    topics: [
      "bode-plots-control",
      "amplifier-frequency-response",
      "feedback-topologies",
      "small-signal-models",
      "active-filters",
    ],
  },
  "diff-amp": {
    name: "Differential amplifier and CMRR",
    params: z.object({ ad: num(1, 10000), acm: num(0.001, 10) }),
    help: "ad: differential gain (1..10000); acm: common-mode gain (0.001..10).",
    topics: ["differential-amplifier", "current-mirror"],
  },
  "adc-dac": {
    name: "SAR ADC and DAC",
    params: z.object({ bits: int(2, 10), vref: num(1, 10), vin: num(0, 10) }),
    help: "bits 2..10; vref 1..10 V; vin 0..vref.",
    topics: ["adc", "dac", "adc-dac-interfacing", "switched-capacitor"],
  },
  modulation: {
    name: "AM and FM waveforms",
    params: z.object({ kind: z.enum(["am", "fm"]), index: num(0, 10) }),
    help: 'kind "am" (index m 0..1.5) or "fm" (index β 0..10).',
    topics: ["am-dsb", "ssb-vsb", "fm-pm", "fm-bandwidth"],
  },
  pcm: {
    name: "PCM quantisation",
    params: z.object({ bits: int(1, 8) }),
    help: "bits per sample 1..8.",
    topics: ["pam-pcm", "dpcm-delta", "finite-word-length", "snr-preemphasis"],
  },
  constellation: {
    name: "Digital modulation constellation with noise",
    params: z.object({ scheme: z.enum(["BPSK", "QPSK", "16-QAM"]), noise: num(0, 0.6) }),
    help: 'scheme "BPSK", "QPSK" or "16-QAM"; noise standard deviation 0..0.6.',
    topics: ["psk-fsk-qam", "matched-filter", "noise-gaussian", "msk-equalisation", "isi-nyquist"],
  },
  "dft-spectrum": {
    name: "DFT spectrum, leakage and windows",
    params: z.object({ f1: num(1, 20), f2: num(1, 31) }),
    help: "f1 and f2: tone frequencies in bins (f1 may be fractional to show leakage).",
    topics: ["dft", "fft", "spectral-estimation", "dtft-dft", "window-method", "fourier-transform"],
  },
  "fir-design": {
    name: "FIR low-pass design (window method)",
    params: z.object({ taps: int(5, 101), cutoff: num(0.02, 0.45) }),
    help: "taps 5..101 (odd); cutoff as a fraction of the sampling rate (0.02..0.45).",
    topics: ["fir-basics", "window-method", "parks-mcclellan"],
  },
  "iir-response": {
    name: "Butterworth / Chebyshev response",
    params: z.object({ type: z.enum(["butterworth", "chebyshev"]), order: int(1, 10) }),
    help: 'type "butterworth" or "chebyshev"; order 1..10.',
    topics: ["butterworth-chebyshev", "iir-basics", "bilinear-transform", "passive-filters"],
  },
  "segment-address": {
    name: "8086 segment:offset addressing",
    params: z.object({ segment: int(0, 65535), offset: int(0, 65535) }),
    help: "segment and offset: 16-bit values (0..65535).",
    topics: ["intel-8086", "memory-interfacing"],
  },
  "address-decoder": {
    name: "Memory chip selection",
    params: z.object({
      chipKb: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(8)]),
      chips: int(2, 8),
    }),
    help: "chipKb 1, 2, 4 or 8; chips 2..8.",
    topics: ["memory-interfacing", "microcomputer-blocks", "semiconductor-memories"],
  },
  "accumulator-machine": {
    name: "Accumulator machine (8085 style)",
    params: z.object({ program: z.enum(["multiply", "countdown"]) }),
    help: 'program "multiply" (5 × 3 by repeated addition) or "countdown".',
    topics: [
      "intel-8085",
      "assembly-programming",
      "instruction-cycle",
      "intel-8051",
      "functional-units",
    ],
  },
  "transmission-line": {
    name: "Transmission line standing waves",
    params: z.object({ loadOhms: num(0, 300), z0: num(25, 150) }),
    help: "loadOhms: load resistance (0..300); z0: characteristic impedance (25..150).",
    topics: ["reflection-vswr", "tx-line-equations", "impedance-matching", "smith-chart"],
  },
  polarisation: {
    name: "Wave polarisation",
    params: z.object({ ex: num(0, 1), ey: num(0, 1), phaseDeg: num(0, 180) }),
    help: "ex, ey: field amplitudes (0..1); phaseDeg: phase difference (0..180).",
    topics: ["polarisation", "plane-wave-propagation"],
  },
  waveguide: {
    name: "Rectangular waveguide cut-offs",
    params: z.object({ widthMm: num(5, 60), heightMm: num(2, 30) }),
    help: "widthMm (broad wall a, 5..60) and heightMm (b, 2..30), e.g. 22.86 × 10.16 for WR-90.",
    topics: ["rectangular-waveguide", "parallel-plate-guide"],
  },
  "skin-depth": {
    name: "Skin depth against frequency",
    params: z.object({}),
    help: "no parameters: the student picks the metal and the frequency.",
    topics: ["conducting-media-skin", "poynting-emt"],
  },
  "mosfet-iv": {
    name: "NMOS I–V characteristics",
    params: z.object({ vth: num(0.3, 1.5), k: num(0.1, 5) }),
    help: "vth: threshold (0.3..1.5 V); k: k'W/L in mA/V² (0.1..5).",
    topics: ["mos-models", "mosfet", "mos-switch"],
  },
  "cmos-inverter": {
    name: "CMOS inverter transfer characteristic",
    params: z.object({ vdd: num(1, 5) }),
    help: "vdd: supply voltage (1..5 V).",
    topics: ["inverter-vtc", "cmos-inverter", "static-cmos-logic"],
  },
  "cmos-power": {
    name: "CMOS dynamic power",
    params: z.object({
      capacitancePf: num(0.1, 1000),
      voltage: num(0.5, 5),
      frequencyMhz: num(1, 3000),
      activity: num(0.01, 1),
    }),
    help: "capacitancePf 0.1..1000; voltage 0.5..5; frequencyMhz 1..3000; activity factor 0.01..1.",
    topics: ["cmos-power", "rc-delay-logical-effort", "dynamic-logic"],
  },
} as const;
