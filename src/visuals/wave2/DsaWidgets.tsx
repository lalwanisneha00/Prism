"use client";

import { useMemo, useState } from "react";
import { Readout, Slider, WidgetButton, WidgetShell } from "@/visuals/ui";
import { Cells, Choice, StepNav, TextField, TraceTable } from "@/visuals/wave2/ui2";
import {
  bstFrom,
  bstInsert,
  bstSearchPath,
  dijkstra,
  evalPostfix,
  hashInsertAll,
  heapExtract,
  heapInsert,
  height,
  knapsack,
  kruskal,
  layoutTree,
  pathTo,
  shuntingYard,
  traversal,
  traverse,
  type BstNode,
  type Graph,
  type Probe,
} from "@/visuals/wave2/algoModels";
import { nCr, nPr, truthTable, unionSize } from "@/visuals/wave2/theoryModels";

/** Push/pop a stack or enqueue/dequeue a queue. */
export function StackQueue({
  mode: start,
  values,
  caption,
}: {
  mode: "stack" | "queue";
  values: number[];
  caption: string;
}) {
  const [mode, setMode] = useState(start);
  const [items, setItems] = useState(values);
  const [next, setNext] = useState(Math.max(0, ...values) + 1);
  const [last, setLast] = useState("");
  const add = () => {
    setItems((s) => [...s, next]);
    setLast(`${mode === "stack" ? "push" : "enqueue"}(${next})`);
    setNext((n) => n + 1);
  };
  const remove = () => {
    if (!items.length)
      return setLast(
        mode === "stack" ? "underflow: the stack is empty" : "underflow: the queue is empty",
      );
    setLast(
      `${mode === "stack" ? "pop" : "dequeue"}() → ${mode === "stack" ? items[items.length - 1] : items[0]}`,
    );
    setItems((s) => (mode === "stack" ? s.slice(0, -1) : s.slice(1)));
  };
  return (
    <WidgetShell
      title={mode === "stack" ? "Stack (last in, first out)" : "Queue (first in, first out)"}
      caption={caption}
      readouts={
        <>
          <Readout label="Size" value={String(items.length)} />
          <Readout
            label={mode === "stack" ? "Top" : "Front"}
            value={
              items.length ? String(mode === "stack" ? items[items.length - 1] : items[0]) : "—"
            }
          />
          <Readout label="Last operation" value={last || "—"} />
        </>
      }
      controls={
        <>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <WidgetButton onClick={add}>
              {mode === "stack" ? "Push" : "Enqueue"} {next}
            </WidgetButton>
            <WidgetButton onClick={remove}>{mode === "stack" ? "Pop" : "Dequeue"}</WidgetButton>
          </div>
          <Choice options={["stack", "queue"] as const} value={mode} onChange={setMode} />
        </>
      }
    >
      <div className="p-3">
        <Cells
          items={items}
          highlight={items.length ? [mode === "stack" ? items.length - 1 : 0] : []}
          vertical={mode === "stack"}
          label={mode === "stack" ? "bottom → top" : "front → rear"}
        />
      </div>
    </WidgetShell>
  );
}

/** Infix to postfix (shunting yard) and stack evaluation. */
export function Postfix({ expression, caption }: { expression: string; caption: string }) {
  const [expr, setExpr] = useState(expression);
  const steps = useMemo(() => shuntingYard(expr), [expr]);
  const [i, setI] = useState(0);
  const at = steps[Math.min(i, steps.length - 1)];
  const final = steps.at(-1)!.output;
  const numeric = final.every((t) => /^\d+(\.\d+)?$/.test(t) || "+-*/^".includes(t));
  const value = numeric && final.length ? evalPostfix(final).value : null;
  return (
    <WidgetShell
      title="Infix to postfix with a stack"
      caption={caption}
      readouts={
        <>
          <Readout label="Postfix" value={final.join(" ")} />
          <Readout
            label="Value"
            value={
              value === null || !Number.isFinite(value) ? "—" : String(Number(value.toPrecision(8)))
            }
          />
        </>
      }
      controls={
        <>
          <TextField
            label="Infix expression"
            value={expr}
            onChange={(v) => {
              setExpr(v);
              setI(0);
            }}
          />
          <StepNav index={i} count={steps.length} onChange={setI} />
        </>
      }
    >
      <div className="flex flex-col gap-3 p-3">
        <p className="text-sm">
          Token <b className="font-mono">{at.token}</b>: {at.note}
        </p>
        <Cells
          items={at.stack}
          label="Operator stack (bottom → top)"
          highlight={at.stack.length ? [at.stack.length - 1] : []}
        />
        <Cells items={at.output} label="Output so far" />
      </div>
    </WidgetShell>
  );
}

/** A singly linked list: insert at head/tail, delete a value, see the pointers. */
export function LinkedListWidget({ values, caption }: { values: number[]; caption: string }) {
  const [list, setList] = useState(values);
  const [value, setValue] = useState(7);
  const [last, setLast] = useState("");
  return (
    <WidgetShell
      title="Singly linked list"
      caption={caption}
      readouts={
        <>
          <Readout label="Length" value={String(list.length)} />
          <Readout label="Head" value={list.length ? String(list[0]) : "NULL"} />
          <Readout label="Last operation" value={last || "—"} />
        </>
      }
      controls={
        <>
          <Slider
            label="Value"
            value={value}
            min={0}
            max={99}
            step={1}
            unit=""
            onChange={setValue}
          />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <WidgetButton
              onClick={() => {
                setList((l) => [value, ...l]);
                setLast(`insert ${value} at head: O(1)`);
              }}
            >
              Insert at head
            </WidgetButton>
            <WidgetButton
              onClick={() => {
                setList((l) => [...l, value]);
                setLast(`insert ${value} at tail: O(n) walk without a tail pointer`);
              }}
            >
              Insert at tail
            </WidgetButton>
            <WidgetButton
              onClick={() => {
                const k = list.indexOf(value);
                setLast(
                  k === -1
                    ? `${value} not found after ${list.length} comparisons`
                    : `delete ${value}: previous node now points past it`,
                );
                if (k !== -1) setList((l) => l.filter((_, j) => j !== k));
              }}
            >
              Delete {value}
            </WidgetButton>
          </div>
        </>
      }
    >
      <div
        className="flex flex-wrap items-center gap-1 p-3 font-mono text-sm"
        role="img"
        aria-label={`List ${list.join(" → ")} → NULL`}
      >
        <span className="text-xs text-muted">head →</span>
        {list.map((v, k) => (
          <span key={k} className="flex items-center gap-1">
            <span className="flex overflow-hidden rounded-md border border-border">
              <span className="bg-surface px-2 py-1">{v}</span>
              <span className="border-l border-border bg-surface-2 px-1.5 py-1 text-xs text-muted">
                next
              </span>
            </span>
            <span aria-hidden="true">→</span>
          </span>
        ))}
        <span className="text-xs text-muted">NULL</span>
      </div>
    </WidgetShell>
  );
}

function TreeSvg({ root, highlight = [] }: { root: BstNode | null; highlight?: number[] }) {
  const nodes = layoutTree(root);
  const h = Math.max(1, height(root));
  const W = Math.max(320, nodes.length * 44);
  const H = h * 56 + 20;
  const x = (r: number) => 24 + (r * (W - 48)) / Math.max(1, nodes.length - 1);
  const y = (d: number) => 24 + d * 56;
  const pos = new Map(nodes.map((n) => [n.key, n]));
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="block w-full"
      role="img"
      aria-label={`Tree with ${nodes.length} nodes`}
    >
      {nodes.map((n) => {
        const p = n.parent === null ? null : pos.get(n.parent)!;
        return p ? (
          <line
            key={`e${n.key}`}
            x1={x(p.x)}
            y1={y(p.y)}
            x2={x(n.x)}
            y2={y(n.y)}
            stroke="var(--border)"
            strokeWidth={2}
          />
        ) : null;
      })}
      {nodes.map((n) => (
        <g key={n.key}>
          <circle
            cx={x(n.x)}
            cy={y(n.y)}
            r={16}
            fill={highlight.includes(n.key) ? "#e1306c" : "var(--primary)"}
          />
          <text
            x={x(n.x)}
            y={y(n.y) + 4}
            textAnchor="middle"
            fontSize="12"
            fill="white"
            fontWeight="bold"
          >
            {n.key}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Binary search tree: insert keys, search, and the three traversal orders. */
export function BstWidget({ keys, caption }: { keys: number[]; caption: string }) {
  const [root, setRoot] = useState(() => bstFrom(keys));
  const [value, setValue] = useState(45);
  const [order, setOrder] = useState<"in" | "pre" | "post">("in");
  const path = bstSearchPath(root, value);
  const found = path.at(-1) === value;
  return (
    <WidgetShell
      title="Binary search tree"
      caption={caption}
      readouts={
        <>
          <Readout label={`${order}-order`} value={traverse(root, order).join(" ")} />
          <Readout label="Height" value={String(height(root))} />
          <Readout
            label={`Search ${value}`}
            value={`${found ? "found" : "not found"} in ${path.length} comparisons`}
          />
        </>
      }
      controls={
        <>
          <Slider label="Key" value={value} min={1} max={99} step={1} unit="" onChange={setValue} />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <WidgetButton onClick={() => setRoot((r) => bstInsert(r, value))}>
              Insert {value}
            </WidgetButton>
            <WidgetButton onClick={() => setRoot(bstFrom(keys))}>Reset</WidgetButton>
          </div>
          <Choice
            options={["in", "pre", "post"] as const}
            value={order}
            onChange={setOrder}
            labels={{ in: "In-order", pre: "Pre-order", post: "Post-order" }}
          />
        </>
      }
    >
      <TreeSvg root={root} highlight={path} />
    </WidgetShell>
  );
}

/** Min-heap stored in an array: insert and extract-min with sift up / sift down. */
export function HeapWidget({ values, caption }: { values: number[]; caption: string }) {
  const [heap, setHeap] = useState(() =>
    values.reduce<number[]>((h, v) => heapInsert(h, v).at(-1)!, []),
  );
  const [value, setValue] = useState(4);
  const [note, setNote] = useState("");
  return (
    <WidgetShell
      title="Binary min-heap"
      caption={caption}
      readouts={
        <>
          <Readout label="Minimum (root)" value={heap.length ? String(heap[0]) : "—"} />
          <Readout label="Size" value={String(heap.length)} />
          <Readout label="Last operation" value={note || "—"} />
        </>
      }
      controls={
        <>
          <Slider
            label="Value"
            value={value}
            min={0}
            max={99}
            step={1}
            unit=""
            onChange={setValue}
          />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <WidgetButton
              onClick={() => {
                const s = heapInsert(heap, value);
                setHeap(s.at(-1)!);
                setNote(`insert ${value}: ${s.length - 1} swaps up`);
              }}
            >
              Insert {value}
            </WidgetButton>
            <WidgetButton
              onClick={() => {
                if (!heap.length) return;
                const r = heapExtract(heap);
                setHeap(r.states.at(-1)!);
                setNote(`extract-min → ${r.min}: ${r.states.length - 1} swaps down`);
              }}
            >
              Extract min
            </WidgetButton>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-2 p-2">
        <HeapTree nodes={heap} />
        <Cells
          items={heap}
          label="As an array: children of i are 2i+1 and 2i+2"
          highlight={heap.length ? [0] : []}
        />
      </div>
    </WidgetShell>
  );
}

function HeapTree({ nodes }: { nodes: number[] }) {
  // A heap drawn level by level (positions from the array index, not BST order).
  const levels = Math.max(1, Math.ceil(Math.log2(nodes.length + 1)));
  const W = 360;
  const H = levels * 50 + 20;
  const pos = (i: number) => {
    const level = Math.floor(Math.log2(i + 1));
    const first = 2 ** level - 1;
    const slots = 2 ** level;
    return { x: ((i - first + 0.5) * W) / slots, y: 22 + level * 50 };
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Heap as a tree">
      {nodes.map((_, i) =>
        i > 0 ? (
          <line
            key={`l${i}`}
            x1={pos(i).x}
            y1={pos(i).y}
            x2={pos(Math.floor((i - 1) / 2)).x}
            y2={pos(Math.floor((i - 1) / 2)).y}
            stroke="var(--border)"
            strokeWidth={2}
          />
        ) : null,
      )}
      {nodes.map((v, i) => (
        <g key={i}>
          <circle
            cx={pos(i).x}
            cy={pos(i).y}
            r={15}
            fill={i === 0 ? "#e1306c" : "var(--primary)"}
          />
          <text
            x={pos(i).x}
            y={pos(i).y + 4}
            textAnchor="middle"
            fontSize="12"
            fill="white"
            fontWeight="bold"
          >
            {v}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Hash table with h(k) = k mod m, using linear or quadratic probing, or chaining. */
export function HashTable({
  keys,
  size,
  probe: start,
  caption,
}: {
  keys: number[];
  size: number;
  probe: Probe;
  caption: string;
}) {
  const [probe, setProbe] = useState<Probe>(start);
  const [count, setCount] = useState(keys.length);
  const r = hashInsertAll(keys.slice(0, count), size, probe);
  const lastLog = r.log.at(-1);
  const collisions = r.log.filter((l) => l.collided).length;
  return (
    <WidgetShell
      title={`Hash table (h(k) = k mod ${size}, ${probe})`}
      caption={caption}
      readouts={
        <>
          <Readout
            label="Last key"
            value={
              lastLog
                ? `${lastLog.key} → slot ${lastLog.slot} (${lastLog.probes} probe${lastLog.probes > 1 ? "s" : ""})`
                : "—"
            }
          />
          <Readout label="Collisions" value={String(collisions)} />
          <Readout label="Load factor" value={(count / size).toFixed(2)} />
        </>
      }
      controls={
        <>
          <Slider
            label="Keys inserted"
            value={count}
            min={0}
            max={keys.length}
            step={1}
            unit=""
            onChange={setCount}
          />
          <Choice
            options={["linear", "quadratic", "chaining"] as const}
            value={probe}
            onChange={setProbe}
          />
        </>
      }
    >
      <div className="grid gap-1 p-3 font-mono text-sm" style={{ gridTemplateColumns: "auto 1fr" }}>
        {Array.from({ length: size }, (_, i) => (
          <div key={i} className="contents">
            <span className="pr-2 text-right text-xs text-muted">{i}</span>
            <span
              className={`rounded border px-2 py-1 ${lastLog?.slot === i ? "border-[#e1306c] bg-[#e1306c]/10" : "border-border bg-surface"}`}
            >
              {r.table ? (r.table[i] ?? "·") : r.buckets![i].join(" → ") || "·"}
            </span>
          </div>
        ))}
      </div>
    </WidgetShell>
  );
}

const GRAPH: Graph & { pos: Record<string, [number, number]> } = {
  nodes: ["A", "B", "C", "D", "E", "F"],
  edges: [
    { a: "A", b: "B", w: 4 },
    { a: "A", b: "C", w: 2 },
    { a: "B", b: "C", w: 1 },
    { a: "B", b: "D", w: 5 },
    { a: "C", b: "D", w: 8 },
    { a: "C", b: "E", w: 10 },
    { a: "D", b: "E", w: 2 },
    { a: "D", b: "F", w: 6 },
    { a: "E", b: "F", w: 3 },
  ],
  pos: { A: [40, 110], B: [140, 40], C: [140, 180], D: [260, 40], E: [260, 180], F: [360, 110] },
};

type GraphAlgo = "bfs" | "dfs" | "dijkstra" | "kruskal";

/** BFS, DFS, Dijkstra and Kruskal on one weighted graph, step by step. */
export function GraphAlgorithms({
  algorithm,
  start,
  caption,
}: {
  algorithm: GraphAlgo;
  start: string;
  caption: string;
}) {
  const [algo, setAlgo] = useState<GraphAlgo>(algorithm);
  const [i, setI] = useState(0);
  const src = GRAPH.nodes.includes(start) ? start : "A";
  const trav = algo === "bfs" || algo === "dfs" ? traversal(GRAPH, src, algo) : null;
  const dij = algo === "dijkstra" ? dijkstra(GRAPH, src) : null;
  const kr = algo === "kruskal" ? kruskal(GRAPH) : null;
  const count = trav ? trav.order.length : dij ? dij.steps.length : kr!.steps.length;
  const k = Math.min(i, count - 1);
  const visited = trav
    ? trav.order.slice(0, k + 1)
    : dij
      ? dij.steps.slice(0, k + 1).map((s) => s.visit)
      : [];
  const treeEdges = new Set(
    kr
      ? kr.steps
          .slice(0, k + 1)
          .filter((s) => s.taken)
          .map((s) => `${s.edge.a}${s.edge.b}`)
      : dij
        ? visited.filter((v) => dij.prev[v]).map((v) => [dij.prev[v]!, v].sort().join(""))
        : [],
  );
  const current = kr ? kr.steps[k].edge : null;
  const status = trav
    ? `Visit order: ${trav.order.slice(0, k + 1).join(" → ")}`
    : dij
      ? `Finalised ${dij.steps[k].visit}; distances: ${Object.entries(dij.steps[k].dist)
          .map(([n, d]) => `${n}=${d === Infinity ? "∞" : d}`)
          .join(" ")}`
      : `Edge ${current!.a}–${current!.b} (${current!.w}): ${kr!.steps[k].taken ? "added" : "skipped (would make a cycle)"}`;
  return (
    <WidgetShell
      title={
        {
          bfs: "Breadth-first search",
          dfs: "Depth-first search",
          dijkstra: "Dijkstra's shortest paths",
          kruskal: "Kruskal's minimum spanning tree",
        }[algo]
      }
      caption={caption}
      readouts={
        <>
          {dij && (
            <Readout
              label={`Shortest path ${src} → F`}
              value={`${pathTo(dij.prev, "F").join(" → ")} (${dij.dist.F})`}
            />
          )}
          {kr && <Readout label="MST total weight" value={String(kr.total)} />}
          {trav && (
            <Readout
              label={algo === "bfs" ? "Queue" : "Path (stack)"}
              value={trav.frontier[k].join(" ") || "—"}
            />
          )}
        </>
      }
      controls={
        <>
          <Choice
            options={["bfs", "dfs", "dijkstra", "kruskal"] as const}
            value={algo}
            onChange={(a) => {
              setAlgo(a);
              setI(0);
            }}
            labels={{ bfs: "BFS", dfs: "DFS", dijkstra: "Dijkstra", kruskal: "Kruskal" }}
          />
          <StepNav index={k} count={count} onChange={setI} />
        </>
      }
    >
      <svg viewBox="0 0 400 220" className="block w-full" role="img" aria-label={status}>
        {GRAPH.edges.map((e) => {
          const [x1, y1] = GRAPH.pos[e.a];
          const [x2, y2] = GRAPH.pos[e.b];
          const on = treeEdges.has([e.a, e.b].sort().join(""));
          const cur = current && current.a === e.a && current.b === e.b;
          return (
            <g key={`${e.a}${e.b}`}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={cur ? "#f59e0b" : on ? "#e1306c" : "var(--border)"}
                strokeWidth={on || cur ? 4 : 2}
              />
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 4}
                textAnchor="middle"
                fontSize="11"
                fill="var(--muted)"
              >
                {e.w}
              </text>
            </g>
          );
        })}
        {GRAPH.nodes.map((n) => (
          <g key={n}>
            <circle
              cx={GRAPH.pos[n][0]}
              cy={GRAPH.pos[n][1]}
              r={17}
              fill={visited.includes(n) ? "#10b981" : "var(--primary)"}
            />
            <text
              x={GRAPH.pos[n][0]}
              y={GRAPH.pos[n][1] + 5}
              textAnchor="middle"
              fontSize="14"
              fill="white"
              fontWeight="bold"
            >
              {n}
            </text>
          </g>
        ))}
      </svg>
      <p className="px-3 pb-3 text-sm" role="status">
        {status}
      </p>
    </WidgetShell>
  );
}

/** The 0/1 knapsack dynamic-programming table, filled row by row. */
export function KnapsackDp({
  weights,
  values,
  capacity,
  caption,
}: {
  weights: number[];
  values: number[];
  capacity: number;
  caption: string;
}) {
  const r = knapsack(weights, values, capacity);
  const [row, setRow] = useState(weights.length);
  return (
    <WidgetShell
      title="0/1 knapsack (dynamic programming)"
      caption={caption}
      readouts={
        <>
          <Readout label="Best value" value={String(r.value)} />
          <Readout
            label="Items chosen"
            value={r.chosen.map((c) => `#${c + 1}`).join(", ") || "none"}
          />
          <Readout label="Table size" value={`${weights.length + 1} × ${capacity + 1}`} />
        </>
      }
      controls={
        <Slider
          label="Rows filled (items considered)"
          value={row}
          min={0}
          max={weights.length}
          step={1}
          unit=""
          onChange={setRow}
        />
      }
    >
      <TraceTable
        head={["item (w, v)", ...Array.from({ length: capacity + 1 }, (_, w) => String(w))]}
        rows={r.best
          .slice(0, row + 1)
          .map((cells, i) => [
            i === 0 ? "none" : `#${i} (${weights[i - 1]}, ${values[i - 1]})`,
            ...cells,
          ])}
        highlightRow={row}
      />
    </WidgetShell>
  );
}

/** Truth table of a propositional formula, with tautology / contradiction check. */
export function TruthTableWidget({ formula, caption }: { formula: string; caption: string }) {
  const [f, setF] = useState(formula);
  const t = useMemo(() => {
    try {
      return truthTable(f);
    } catch {
      return null;
    }
  }, [f]);
  return (
    <WidgetShell
      title="Truth table"
      caption={caption}
      readouts={
        <Readout
          label="Classification"
          value={
            !t
              ? "can't read the formula"
              : t.tautology
                ? "tautology (always true)"
                : t.contradiction
                  ? "contradiction (always false)"
                  : "contingent"
          }
        />
      }
      controls={<TextField label="Formula (p, q, r with ! & | -> <->)" value={f} onChange={setF} />}
    >
      {t && (
        <TraceTable
          head={[...t.vars, f]}
          rows={t.rows.map((r) => [...r.values.map((v) => (v ? "T" : "F")), r.result ? "T" : "F"])}
        />
      )}
    </WidgetShell>
  );
}

/** Inclusion–exclusion on a three-set Venn diagram. */
export function VennCount({
  a,
  b,
  c,
  ab,
  bc,
  ac,
  abc,
  caption,
}: {
  a: number;
  b: number;
  c: number;
  ab: number;
  bc: number;
  ac: number;
  abc: number;
  caption: string;
}) {
  const [vals, setVals] = useState({ a, b, c, ab, bc, ac, abc });
  const set = (k: keyof typeof vals) => (v: number) => setVals((s) => ({ ...s, [k]: v }));
  const total = unionSize(vals.a, vals.b, vals.c, vals.ab, vals.bc, vals.ac, vals.abc);
  return (
    <WidgetShell
      title="Inclusion–exclusion: |A ∪ B ∪ C|"
      caption={caption}
      readouts={
        <>
          <Readout label="|A ∪ B ∪ C|" value={String(total)} />
          <Readout
            label="Formula"
            value={`${vals.a}+${vals.b}+${vals.c}−${vals.ab}−${vals.bc}−${vals.ac}+${vals.abc}`}
          />
        </>
      }
      controls={
        <>
          {(["a", "b", "c", "ab", "bc", "ac", "abc"] as const).map((k) => (
            <Slider
              key={k}
              label={`|${k.toUpperCase().split("").join(" ∩ ")}|`}
              value={vals[k]}
              min={0}
              max={50}
              step={1}
              unit=""
              onChange={set(k)}
            />
          ))}
        </>
      }
    >
      <svg
        viewBox="0 0 300 200"
        className="mx-auto block w-full max-w-sm"
        role="img"
        aria-label={`Union has ${total} elements`}
      >
        <circle cx={115} cy={80} r={60} fill="#3b82f6" fillOpacity={0.25} stroke="#3b82f6" />
        <circle cx={185} cy={80} r={60} fill="#e1306c" fillOpacity={0.25} stroke="#e1306c" />
        <circle cx={150} cy={135} r={60} fill="#10b981" fillOpacity={0.25} stroke="#10b981" />
        <text x={80} y={60} fontSize="14" fill="var(--fg)">
          A
        </text>
        <text x={215} y={60} fontSize="14" fill="var(--fg)">
          B
        </text>
        <text x={146} y={185} fontSize="14" fill="var(--fg)">
          C
        </text>
        <text x={150} y={105} textAnchor="middle" fontSize="12" fill="var(--fg)">
          {vals.abc}
        </text>
      </svg>
    </WidgetShell>
  );
}

/** Permutations and combinations. */
export function Combinatorics({
  n: n0,
  r: r0,
  caption,
}: {
  n: number;
  r: number;
  caption: string;
}) {
  const [n, setN] = useState(n0);
  const [r, setR] = useState(Math.min(r0, n0));
  const rr = Math.min(r, n);
  return (
    <WidgetShell
      title="Permutations and combinations"
      caption={caption}
      readouts={
        <>
          <Readout
            label="nPr = n!/(n−r)! (order matters)"
            value={nPr(n, rr).toLocaleString("en-IN")}
          />
          <Readout
            label="nCr = n!/(r!(n−r)!) (order doesn't)"
            value={nCr(n, rr).toLocaleString("en-IN")}
          />
          <Readout label="Each choice counted" value={`${nPr(rr, rr)} times in nPr`} />
        </>
      }
      controls={
        <>
          <Slider label="n (items)" value={n} min={1} max={20} step={1} unit="" onChange={setN} />
          <Slider label="r (chosen)" value={rr} min={0} max={n} step={1} unit="" onChange={setR} />
        </>
      }
    >
      <div className="flex flex-wrap gap-1 p-3">
        {Array.from({ length: n }, (_, i) => (
          <span
            key={i}
            className={`grid size-8 place-items-center rounded-full text-xs font-bold ${i < rr ? "bg-primary text-primary-fg" : "border border-border"}`}
          >
            {i + 1}
          </span>
        ))}
      </div>
    </WidgetShell>
  );
}
