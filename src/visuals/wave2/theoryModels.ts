/*
 * Theory of computation, compilers, discrete maths, software engineering, web and AI/ML
 * models for Wave 2 widgets (V3 · Step 8). Pure and tested in theoryModels.test.ts.
 */

// ---------------------------------------------------------------- automata

export type Dfa = {
  name: string;
  states: string[];
  start: string;
  accept: string[];
  delta: Record<string, Record<string, string>>;
};

/** Ready-made DFAs over {0,1} for the widget. */
export const DFAS: Record<string, Dfa> = {
  "even-zeros": {
    name: "Even number of 0s",
    states: ["E", "O"],
    start: "E",
    accept: ["E"],
    delta: { E: { "0": "O", "1": "E" }, O: { "0": "E", "1": "O" } },
  },
  "ends-01": {
    name: "Ends with 01",
    states: ["q0", "q1", "q2"],
    start: "q0",
    accept: ["q2"],
    delta: {
      q0: { "0": "q1", "1": "q0" },
      q1: { "0": "q1", "1": "q2" },
      q2: { "0": "q1", "1": "q0" },
    },
  },
  "div-by-3": {
    name: "Binary number divisible by 3",
    states: ["r0", "r1", "r2"],
    start: "r0",
    accept: ["r0"],
    delta: {
      r0: { "0": "r0", "1": "r1" },
      r1: { "0": "r2", "1": "r0" },
      r2: { "0": "r1", "1": "r2" },
    },
  },
};

export function runDfa(dfa: Dfa, input: string) {
  const path = [dfa.start];
  let state = dfa.start;
  for (const ch of input) {
    const next = dfa.delta[state]?.[ch];
    if (!next) return { path, accepted: false, stuck: true };
    state = next;
    path.push(state);
  }
  return { path, accepted: dfa.accept.includes(state), stuck: false };
}

/** A Turing machine that adds 1 to a binary number (head starts on the rightmost bit). */
export function tmIncrement(input: string) {
  const tape = ["_", ...input.split(""), "_"];
  let head = tape.length - 2;
  let state = "carry";
  const steps: { tape: string; head: number; state: string }[] = [
    { tape: tape.join(""), head, state },
  ];
  while (state !== "halt") {
    const sym = tape[head];
    if (state === "carry") {
      if (sym === "1") {
        tape[head] = "0";
        head--;
      } else {
        tape[head] = "1";
        state = "halt";
      }
    }
    steps.push({ tape: tape.join(""), head, state });
    if (steps.length > 200) break;
  }
  return { result: tape.join("").replace(/_/g, ""), steps };
}

/** A pushdown automaton for balanced brackets: the stack after each symbol. */
export function balancedPda(input: string) {
  const stack: string[] = [];
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const steps: { symbol: string; stack: string; ok: boolean }[] = [];
  for (const c of input) {
    let ok = true;
    if ("([{".includes(c)) stack.push(c);
    else if (c in pairs) ok = stack.pop() === pairs[c];
    steps.push({ symbol: c, stack: stack.join(""), ok });
    if (!ok) return { accepted: false, steps };
  }
  return { accepted: stack.length === 0, steps };
}

// ---------------------------------------------------------------- compilers

export type Token = {
  kind: "number" | "identifier" | "keyword" | "operator" | "punctuation";
  text: string;
};
const KEYWORDS = new Set(["int", "float", "if", "else", "while", "for", "return"]);

export function lex(source: string): Token[] {
  const out: Token[] = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_]\w*)|(==|!=|<=|>=|[-+*/=<>])|([();{},]))/y;
  let m: RegExpExecArray | null;
  while (re.lastIndex < source.length && (m = re.exec(source))) {
    if (m[1]) out.push({ kind: "number", text: m[1] });
    else if (m[2]) out.push({ kind: KEYWORDS.has(m[2]) ? "keyword" : "identifier", text: m[2] });
    else if (m[3]) out.push({ kind: "operator", text: m[3] });
    else if (m[4]) out.push({ kind: "punctuation", text: m[4] });
    else break;
  }
  return out;
}

/** Three-address code for an arithmetic assignment, e.g. "a = b + c * d". */
export function threeAddressCode(statement: string): string[] {
  const [lhs, rhs] = statement.split("=").map((s) => s.trim());
  const code: string[] = [];
  let temp = 0;
  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
  const tokens = rhs.match(/[A-Za-z_]\w*|\d+|[-+*/()]/g) ?? [];
  const vals: string[] = [];
  const ops: string[] = [];
  const reduce = () => {
    const b = vals.pop()!;
    const a = vals.pop()!;
    const t = `t${++temp}`;
    code.push(`${t} = ${a} ${ops.pop()} ${b}`);
    vals.push(t);
  };
  for (const tk of tokens) {
    if (tk === "(") ops.push(tk);
    else if (tk === ")") {
      while (ops[ops.length - 1] !== "(") reduce();
      ops.pop();
    } else if (tk in prec) {
      while (ops.length && ops[ops.length - 1] in prec && prec[ops[ops.length - 1]] >= prec[tk])
        reduce();
      ops.push(tk);
    } else vals.push(tk);
  }
  while (ops.length) reduce();
  code.push(`${lhs} = ${vals[0]}`);
  return code;
}

// ---------------------------------------------------------------- logic and sets

/** Truth table of a formula in variables p, q, r using !, &, |, -> and <->. */
export function truthTable(formula: string) {
  const vars = ["p", "q", "r"].filter((v) => new RegExp(`\\b${v}\\b`).test(formula));
  const rows: { values: boolean[]; result: boolean }[] = [];
  for (let mask = 0; mask < 1 << vars.length; mask++) {
    const values = vars.map((_, i) => Boolean(mask & (1 << (vars.length - 1 - i))));
    const env = Object.fromEntries(vars.map((v, i) => [v, values[i]]));
    rows.push({ values, result: evalLogic(formula, env) });
  }
  const results = rows.map((r) => r.result);
  return {
    vars,
    rows,
    tautology: results.every(Boolean),
    contradiction: results.every((x) => !x),
  };
}

/** A tiny recursive-descent evaluator: <-> lowest, then ->, |, &, ! highest. */
export function evalLogic(formula: string, env: Record<string, boolean>): boolean {
  const tokens = formula.match(/<->|->|[!&|()]|[a-z]/g) ?? [];
  let i = 0;
  const peek = () => tokens[i];
  const iff = (): boolean => {
    let v = imp();
    while (peek() === "<->") {
      i++;
      v = v === imp();
    }
    return v;
  };
  const imp = (): boolean => {
    const v = or();
    if (peek() === "->") {
      i++;
      return !v || imp();
    }
    return v;
  };
  const or = (): boolean => {
    let v = and();
    while (peek() === "|") {
      i++;
      v = and() || v;
    }
    return v;
  };
  const and = (): boolean => {
    let v = not();
    while (peek() === "&") {
      i++;
      v = not() && v;
    }
    return v;
  };
  const not = (): boolean => {
    if (peek() === "!") {
      i++;
      return !not();
    }
    if (peek() === "(") {
      i++;
      const v = iff();
      i++;
      return v;
    }
    return Boolean(env[tokens[i++]]);
  };
  return iff();
}

export function nPr(n: number, r: number): number {
  let x = 1;
  for (let i = 0; i < r; i++) x *= n - i;
  return x;
}

export function nCr(n: number, r: number): number {
  return nPr(n, r) / nPr(r, r);
}

/** |A ∪ B ∪ C| by inclusion–exclusion. */
export function unionSize(
  a: number,
  b: number,
  c: number,
  ab: number,
  bc: number,
  ac: number,
  abc: number,
) {
  return a + b + c - ab - bc - ac + abc;
}

// ---------------------------------------------------------------- software engineering

export const COCOMO_MODES = {
  organic: { a: 2.4, b: 1.05, c: 2.5, d: 0.38 },
  "semi-detached": { a: 3.0, b: 1.12, c: 2.5, d: 0.35 },
  embedded: { a: 3.6, b: 1.2, c: 2.5, d: 0.32 },
} as const;

/** Basic COCOMO: effort (person-months), time (months) and average staff. */
export function cocomo(kloc: number, mode: keyof typeof COCOMO_MODES) {
  const k = COCOMO_MODES[mode];
  const effort = k.a * kloc ** k.b;
  const time = k.c * effort ** k.d;
  return { effort, time, staff: effort / time };
}

/** Average-complexity IFPUG weights for the five function types. */
export const FP_WEIGHTS = {
  inputs: 4,
  outputs: 5,
  inquiries: 4,
  internalFiles: 10,
  externalFiles: 7,
} as const;

/** Function points: UFP = Σ count × weight; FP = UFP × (0.65 + 0.01 × total degree of influence). */
export function functionPoints(counts: Record<keyof typeof FP_WEIGHTS, number>, tdi: number) {
  const ufp = (Object.keys(FP_WEIGHTS) as (keyof typeof FP_WEIGHTS)[]).reduce(
    (s, k) => s + counts[k] * FP_WEIGHTS[k],
    0,
  );
  const vaf = 0.65 + 0.01 * tdi;
  return { ufp, vaf, fp: ufp * vaf };
}

/** Cyclomatic complexity V(G) = E − N + 2P. */
export function cyclomatic(edges: number, nodes: number, components = 1): number {
  return edges - nodes + 2 * components;
}

// ---------------------------------------------------------------- web

export const HTTP_STATUS: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  301: "Moved Permanently",
  304: "Not Modified",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

export function statusClass(code: number): string {
  return (
    ["", "Informational", "Success", "Redirection", "Client error", "Server error"][
      Math.floor(code / 100)
    ] ?? ""
  );
}

export type DomNode = { tag: string; text?: string; children: DomNode[] };

/** Parses a small, well-formed HTML snippet into a tree (for teaching the DOM, not a real parser). */
export function parseHtml(html: string): DomNode {
  const root: DomNode = { tag: "#document", children: [] };
  const stack = [root];
  for (const m of html.matchAll(/<\/?([a-z][a-z0-9]*)[^>]*>|([^<]+)/gi)) {
    const top = stack[stack.length - 1];
    if (m[2]) {
      const text = m[2].trim();
      if (text) top.children.push({ tag: "#text", text, children: [] });
    } else if (m[0].startsWith("</")) {
      if (stack.length > 1) stack.pop();
    } else {
      const node: DomNode = { tag: m[1].toLowerCase(), children: [] };
      top.children.push(node);
      if (!m[0].endsWith("/>") && !["br", "img", "hr", "input", "meta", "link"].includes(node.tag))
        stack.push(node);
    }
  }
  return root;
}

/** Total rendered width of a CSS box (content-box sizing). */
export function boxWidth(content: number, padding: number, border: number, margin: number) {
  return {
    borderBox: content + 2 * (padding + border),
    total: content + 2 * (padding + border + margin),
  };
}

// ---------------------------------------------------------------- AI and ML

export type Pt = { x: number; y: number };

/** Gradient descent for y = w x + b with mean squared error; returns the path of (w, b, cost). */
export function gradientDescent(points: Pt[], rate: number, steps: number) {
  let w = 0;
  let b = 0;
  const n = points.length;
  const cost = () => points.reduce((s, p) => s + (w * p.x + b - p.y) ** 2, 0) / n;
  const path = [{ w, b, cost: cost() }];
  for (let i = 0; i < steps; i++) {
    let dw = 0;
    let db = 0;
    for (const p of points) {
      const e = w * p.x + b - p.y;
      dw += (2 / n) * e * p.x;
      db += (2 / n) * e;
    }
    w -= rate * dw;
    b -= rate * db;
    path.push({ w, b, cost: cost() });
  }
  return path;
}

/** Least-squares line (the answer gradient descent should approach). */
export function leastSquares(points: Pt[]) {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  const w =
    points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) /
    points.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  return { w, b: my - w * mx };
}

/** k-means: assignments and centroids after each iteration (deterministic start). */
export function kMeans(points: Pt[], k: number, iterations = 10) {
  let centroids = points.slice(0, k).map((p) => ({ ...p }));
  const history: { centroids: Pt[]; assign: number[] }[] = [];
  for (let it = 0; it < iterations; it++) {
    const assign = points.map((p) =>
      centroids.reduce(
        (best, c, i) =>
          (p.x - c.x) ** 2 + (p.y - c.y) ** 2 <
          (p.x - centroids[best].x) ** 2 + (p.y - centroids[best].y) ** 2
            ? i
            : best,
        0,
      ),
    );
    const next = centroids.map((c, i) => {
      const mine = points.filter((_, j) => assign[j] === i);
      return mine.length
        ? {
            x: mine.reduce((s, p) => s + p.x, 0) / mine.length,
            y: mine.reduce((s, p) => s + p.y, 0) / mine.length,
          }
        : c;
    });
    history.push({ centroids: next, assign });
    const moved = next.some(
      (c, i) => Math.hypot(c.x - centroids[i].x, c.y - centroids[i].y) > 1e-9,
    );
    centroids = next;
    if (!moved) break;
  }
  return history;
}

/** Entropy of a class split, and the information gain of splitting a parent into children. */
export function entropy(counts: number[]): number {
  const total = counts.reduce((a, b) => a + b, 0);
  return counts.reduce((s, c) => (c ? s - (c / total) * Math.log2(c / total) : s), 0);
}

export function informationGain(parent: number[], children: number[][]): number {
  const total = parent.reduce((a, b) => a + b, 0);
  const weighted = children.reduce(
    (s, ch) => s + (ch.reduce((a, b) => a + b, 0) / total) * entropy(ch),
    0,
  );
  return entropy(parent) - weighted;
}

/** A* (or breadth-first if heuristic is off) on a grid; walls are "#". Returns path and visit order. */
export function gridSearch(grid: string[], useHeuristic: boolean) {
  const h = grid.length;
  const w = grid[0].length;
  const find = (ch: string) => {
    for (let r = 0; r < h; r++) {
      const c = grid[r].indexOf(ch);
      if (c !== -1) return [r, c] as const;
    }
    return [0, 0] as const;
  };
  const [sr, sc] = find("S");
  const [gr, gc] = find("G");
  const key = (r: number, c: number) => `${r},${c}`;
  const g = new Map([[key(sr, sc), 0]]);
  const prev = new Map<string, string>();
  const open = [{ r: sr, c: sc, f: 0 }];
  const visited: string[] = [];
  const closed = new Set<string>();
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    const k = key(cur.r, cur.c);
    if (closed.has(k)) continue;
    closed.add(k);
    visited.push(k);
    if (cur.r === gr && cur.c === gc) break;
    for (const [dr, dc] of [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]) {
      const r = cur.r + dr;
      const c = cur.c + dc;
      if (r < 0 || c < 0 || r >= h || c >= w || grid[r][c] === "#") continue;
      const nk = key(r, c);
      const ng = g.get(k)! + 1;
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        prev.set(nk, k);
        const heuristic = useHeuristic ? Math.abs(r - gr) + Math.abs(c - gc) : 0;
        open.push({ r, c, f: ng + heuristic });
      }
    }
  }
  const path: string[] = [];
  for (let k: string | undefined = key(gr, gc); k; k = prev.get(k)) path.unshift(k);
  const found = path[0] === key(sr, sc);
  return { path: found ? path : [], visited, length: found ? path.length - 1 : -1 };
}
