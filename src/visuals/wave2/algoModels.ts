/*
 * Data-structure and algorithm models for Wave 2 widgets (V3 · Step 8). Pure functions that
 * return every step, so a widget can play them back one at a time. Tested in algoModels.test.ts.
 */

// ---------------------------------------------------------------- stacks, queues, postfix

/** Infix → postfix with the shunting-yard algorithm, recording the stack at every token. */
export type ShuntStep = { token: string; output: string[]; stack: string[]; note: string };
const PREC: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 };

export function tokenize(expr: string): string[] {
  return expr.match(/\d+(?:\.\d+)?|[A-Za-z]+|[-+*/^()]/g) ?? [];
}

export function shuntingYard(expr: string): ShuntStep[] {
  const output: string[] = [];
  const stack: string[] = [];
  const steps: ShuntStep[] = [];
  for (const token of tokenize(expr)) {
    let note: string;
    if (token in PREC) {
      while (stack.length) {
        const top = stack[stack.length - 1];
        const higher =
          top in PREC && (PREC[top] > PREC[token] || (PREC[top] === PREC[token] && token !== "^"));
        if (!higher) break;
        output.push(stack.pop()!);
      }
      stack.push(token);
      note = `operator ${token}: pop higher-precedence operators, then push`;
    } else if (token === "(") {
      stack.push(token);
      note = "( : push";
    } else if (token === ")") {
      while (stack.length && stack[stack.length - 1] !== "(") output.push(stack.pop()!);
      stack.pop();
      note = ") : pop to the matching (";
    } else {
      output.push(token);
      note = `operand ${token}: straight to the output`;
    }
    steps.push({ token, output: [...output], stack: [...stack], note });
  }
  while (stack.length) output.push(stack.pop()!);
  steps.push({ token: "end", output: [...output], stack: [], note: "end: pop everything left" });
  return steps;
}

/** Evaluates a postfix expression of numbers; returns the value and the stack after each token. */
export function evalPostfix(tokens: string[]): { value: number; stacks: number[][] } {
  const stack: number[] = [];
  const stacks: number[][] = [];
  for (const t of tokens) {
    if (t in PREC) {
      const b = stack.pop()!;
      const a = stack.pop()!;
      stack.push(
        t === "+" ? a + b : t === "-" ? a - b : t === "*" ? a * b : t === "/" ? a / b : a ** b,
      );
    } else stack.push(Number(t));
    stacks.push([...stack]);
  }
  return { value: stack[0], stacks };
}

// ---------------------------------------------------------------- binary search tree

export type BstNode = { key: number; left: BstNode | null; right: BstNode | null };

export function bstInsert(root: BstNode | null, key: number): BstNode {
  if (!root) return { key, left: null, right: null };
  if (key < root.key) return { ...root, left: bstInsert(root.left, key) };
  if (key > root.key) return { ...root, right: bstInsert(root.right, key) };
  return root;
}

export function bstFrom(keys: number[]): BstNode | null {
  return keys.reduce<BstNode | null>((r, k) => bstInsert(r, k), null);
}

export function traverse(root: BstNode | null, order: "in" | "pre" | "post"): number[] {
  if (!root) return [];
  const l = traverse(root.left, order);
  const r = traverse(root.right, order);
  if (order === "pre") return [root.key, ...l, ...r];
  if (order === "post") return [...l, ...r, root.key];
  return [...l, root.key, ...r];
}

export function bstSearchPath(root: BstNode | null, key: number): number[] {
  const path: number[] = [];
  let n = root;
  while (n) {
    path.push(n.key);
    if (key === n.key) break;
    n = key < n.key ? n.left : n.right;
  }
  return path;
}

export function height(root: BstNode | null): number {
  return root ? 1 + Math.max(height(root.left), height(root.right)) : 0;
}

/** Positions for drawing: x by in-order rank, y by depth. */
export function layoutTree(
  root: BstNode | null,
): { key: number; x: number; y: number; parent: number | null }[] {
  const out: { key: number; x: number; y: number; parent: number | null }[] = [];
  let rank = 0;
  const walk = (n: BstNode | null, depth: number, parent: number | null) => {
    if (!n) return;
    walk(n.left, depth + 1, n.key);
    out.push({ key: n.key, x: rank++, y: depth, parent });
    walk(n.right, depth + 1, n.key);
  };
  walk(root, 0, null);
  return out;
}

// ---------------------------------------------------------------- heap

/** Min-heap insert/extract that record the array after each step. */
export function heapInsert(heap: number[], value: number): number[][] {
  const a = [...heap, value];
  const states = [[...a]];
  let i = a.length - 1;
  while (i > 0) {
    const p = Math.floor((i - 1) / 2);
    if (a[p] <= a[i]) break;
    [a[p], a[i]] = [a[i], a[p]];
    states.push([...a]);
    i = p;
  }
  return states;
}

export function heapExtract(heap: number[]): { min: number; states: number[][] } {
  const a = [...heap];
  const min = a[0];
  const last = a.pop()!;
  const states: number[][] = [];
  if (a.length) {
    a[0] = last;
    states.push([...a]);
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let s = i;
      if (l < a.length && a[l] < a[s]) s = l;
      if (r < a.length && a[r] < a[s]) s = r;
      if (s === i) break;
      [a[s], a[i]] = [a[i], a[s]];
      states.push([...a]);
      i = s;
    }
  } else states.push([]);
  return { min, states };
}

// ---------------------------------------------------------------- hashing

export type Probe = "linear" | "quadratic" | "chaining";

/** Inserts keys into a table of size m with h(k) = k mod m; reports probes per key. */
export function hashInsertAll(keys: number[], m: number, probe: Probe) {
  if (probe === "chaining") {
    const buckets: number[][] = Array.from({ length: m }, () => []);
    const log = keys.map((k) => {
      const h = k % m;
      buckets[h].push(k);
      return { key: k, slot: h, probes: 1, collided: buckets[h].length > 1 };
    });
    return { buckets, table: null as (number | null)[] | null, log };
  }
  const table: (number | null)[] = Array(m).fill(null);
  const log = keys.map((k) => {
    const h = k % m;
    for (let i = 0; i < m; i++) {
      const slot = (h + (probe === "linear" ? i : i * i)) % m;
      if (table[slot] === null) {
        table[slot] = k;
        return { key: k, slot, probes: i + 1, collided: i > 0 };
      }
    }
    return { key: k, slot: -1, probes: m, collided: true };
  });
  return { buckets: null as number[][] | null, table, log };
}

// ---------------------------------------------------------------- graphs

export type Edge = { a: string; b: string; w: number };
export type Graph = { nodes: string[]; edges: Edge[]; directed?: boolean };

function neighbours(g: Graph, n: string): { to: string; w: number }[] {
  const out: { to: string; w: number }[] = [];
  for (const e of g.edges) {
    if (e.a === n) out.push({ to: e.b, w: e.w });
    else if (!g.directed && e.b === n) out.push({ to: e.a, w: e.w });
  }
  return out.sort((x, y) => x.to.localeCompare(y.to));
}

/** BFS or DFS visiting order from a start node (neighbours in alphabetical order). */
export function traversal(
  g: Graph,
  start: string,
  kind: "bfs" | "dfs",
): { order: string[]; frontier: string[][] } {
  const order: string[] = [];
  const frontier: string[][] = [];
  if (kind === "dfs") {
    // Recursive depth-first: go as deep as possible before backing up. "frontier" is the path.
    const seen = new Set<string>();
    const visit = (n: string, path: string[]) => {
      seen.add(n);
      order.push(n);
      frontier.push([...path, n]);
      for (const { to } of neighbours(g, n)) if (!seen.has(to)) visit(to, [...path, n]);
    };
    visit(start, []);
    return { order, frontier };
  }
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const n = queue.shift()!;
    order.push(n);
    for (const { to } of neighbours(g, n)) {
      if (!seen.has(to)) {
        seen.add(to);
        queue.push(to);
      }
    }
    frontier.push([...queue]);
  }
  return { order, frontier };
}

/** Dijkstra's algorithm: the distance table after each node is finalised. */
export function dijkstra(g: Graph, source: string) {
  const dist: Record<string, number> = Object.fromEntries(g.nodes.map((n) => [n, Infinity]));
  const prev: Record<string, string | null> = Object.fromEntries(g.nodes.map((n) => [n, null]));
  dist[source] = 0;
  const done = new Set<string>();
  const steps: { visit: string; dist: Record<string, number> }[] = [];
  while (done.size < g.nodes.length) {
    const u = g.nodes
      .filter((n) => !done.has(n))
      .sort((a, b) => dist[a] - dist[b] || a.localeCompare(b))[0];
    if (dist[u] === Infinity) break;
    done.add(u);
    for (const { to, w } of neighbours(g, u)) {
      if (dist[u] + w < dist[to]) {
        dist[to] = dist[u] + w;
        prev[to] = u;
      }
    }
    steps.push({ visit: u, dist: { ...dist } });
  }
  return { dist, prev, steps };
}

export function pathTo(prev: Record<string, string | null>, target: string): string[] {
  const path: string[] = [];
  for (let n: string | null = target; n; n = prev[n]) path.unshift(n);
  return path;
}

/** Kruskal's algorithm: edges considered in weight order, with accept/reject decisions. */
export function kruskal(g: Graph) {
  const parent: Record<string, string> = Object.fromEntries(g.nodes.map((n) => [n, n]));
  const find = (x: string): string => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const steps: { edge: Edge; taken: boolean }[] = [];
  let total = 0;
  for (const e of [...g.edges].sort((x, y) => x.w - y.w || x.a.localeCompare(y.a))) {
    const ra = find(e.a);
    const rb = find(e.b);
    const taken = ra !== rb;
    if (taken) {
      parent[ra] = rb;
      total += e.w;
    }
    steps.push({ edge: e, taken });
  }
  return { steps, total };
}

// ---------------------------------------------------------------- dynamic programming

/** 0/1 knapsack table: best[i][w] = best value with the first i items and capacity w. */
export function knapsack(weights: number[], values: number[], capacity: number) {
  const n = weights.length;
  const best = Array.from({ length: n + 1 }, () => Array(capacity + 1).fill(0) as number[]);
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      best[i][w] = best[i - 1][w];
      if (weights[i - 1] <= w)
        best[i][w] = Math.max(best[i][w], best[i - 1][w - weights[i - 1]] + values[i - 1]);
    }
  }
  const chosen: number[] = [];
  for (let i = n, w = capacity; i > 0; i--) {
    if (best[i][w] !== best[i - 1][w]) {
      chosen.unshift(i - 1);
      w -= weights[i - 1];
    }
  }
  return { best, value: best[n][capacity], chosen };
}
