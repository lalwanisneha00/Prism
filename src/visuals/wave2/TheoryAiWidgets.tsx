"use client";

import { useMemo, useState } from "react";
import { Readout, Slider, WidgetButton, WidgetShell } from "@/visuals/ui";
import { Graph, Legend, makeGraphScale } from "@/visuals/widgets/math/Graph";
import { Cells, Choice, StepNav, TextField, TraceTable } from "@/visuals/wave2/ui2";
import {
  balancedPda,
  boxWidth,
  cocomo,
  COCOMO_MODES,
  cyclomatic,
  DFAS,
  entropy,
  FP_WEIGHTS,
  functionPoints,
  gradientDescent,
  gridSearch,
  HTTP_STATUS,
  informationGain,
  kMeans,
  leastSquares,
  lex,
  parseHtml,
  runDfa,
  statusClass,
  threeAddressCode,
  tmIncrement,
  type DomNode,
  type Pt,
} from "@/visuals/wave2/theoryModels";

const DFA_IDS = Object.keys(DFAS) as (keyof typeof DFAS)[];

/** Runs a DFA on an input string, highlighting the current state. */
export function DfaSim({
  machine,
  input,
  caption,
}: {
  machine: string;
  input: string;
  caption: string;
}) {
  const [id, setId] = useState(DFA_IDS.includes(machine) ? machine : DFA_IDS[0]);
  const [text, setText] = useState(input);
  const dfa = DFAS[id];
  const clean = text.replace(/[^01]/g, "");
  const r = runDfa(dfa, clean);
  const [i, setI] = useState(r.path.length - 1);
  const k = Math.min(i, r.path.length - 1);
  const state = r.path[k];
  const cx = (j: number) => 60 + j * 110;
  return (
    <WidgetShell
      title={`DFA: ${dfa.name}`}
      caption={caption}
      readouts={
        <>
          <Readout label="Input read" value={clean.slice(0, k) || "ε"} />
          <Readout label="Current state" value={state} />
          <Readout label="Result" value={r.accepted ? "accepted" : "rejected"} />
        </>
      }
      controls={
        <>
          <Choice
            options={DFA_IDS}
            value={id}
            onChange={(v) => {
              setId(v);
              setI(0);
            }}
            labels={Object.fromEntries(DFA_IDS.map((d) => [d, DFAS[d].name]))}
          />
          <TextField
            label="Input over {0, 1}"
            value={text}
            onChange={(v) => {
              setText(v);
              setI(0);
            }}
          />
          <StepNav index={k} count={r.path.length} onChange={setI} />
        </>
      }
    >
      <svg
        viewBox={`0 0 ${dfa.states.length * 110 + 20} 150`}
        className="block w-full"
        role="img"
        aria-label={`In state ${state}`}
      >
        {dfa.states.map((s, j) => (
          <g key={s}>
            <circle cx={cx(j)} cy={70} r={26} fill={s === state ? "#e1306c" : "var(--primary)"} />
            {dfa.accept.includes(s) && (
              <circle cx={cx(j)} cy={70} r={31} fill="none" stroke="var(--fg)" strokeWidth={2} />
            )}
            <text x={cx(j)} y={75} textAnchor="middle" fill="white" fontWeight="bold" fontSize="14">
              {s}
            </text>
            {s === dfa.start && (
              <text x={cx(j)} y={22} textAnchor="middle" fontSize="11" fill="var(--muted)">
                start
              </text>
            )}
            <text x={cx(j)} y={130} textAnchor="middle" fontSize="11" fill="var(--muted)">
              0→{dfa.delta[s]["0"]} 1→{dfa.delta[s]["1"]}
            </text>
          </g>
        ))}
      </svg>
    </WidgetShell>
  );
}

/** A Turing machine that adds 1 to a binary number, step by step on its tape. */
export function TuringIncrement({ input, caption }: { input: string; caption: string }) {
  const [text, setText] = useState(input);
  const r = tmIncrement(text.replace(/[^01]/g, "") || "0");
  const [i, setI] = useState(0);
  const k = Math.min(i, r.steps.length - 1);
  const s = r.steps[k];
  return (
    <WidgetShell
      title="Turing machine: binary increment"
      caption={caption}
      readouts={
        <>
          <Readout label="State" value={s.state} />
          <Readout label="Result" value={r.result} />
        </>
      }
      controls={
        <>
          <TextField
            label="Binary number"
            value={text}
            onChange={(v) => {
              setText(v);
              setI(0);
            }}
          />
          <StepNav index={k} count={r.steps.length} onChange={setI} />
        </>
      }
    >
      <div className="p-3">
        <Cells
          items={s.tape.split("")}
          highlight={[s.head]}
          label="Tape (head highlighted; _ is blank)"
        />
      </div>
    </WidgetShell>
  );
}

/** A pushdown automaton checking balanced brackets with its stack. */
export function PdaBrackets({ input, caption }: { input: string; caption: string }) {
  const [text, setText] = useState(input);
  const r = balancedPda(text.replace(/[^()[\]{}]/g, ""));
  return (
    <WidgetShell
      title="Pushdown automaton: balanced brackets"
      caption={caption}
      readouts={
        <Readout
          label="Result"
          value={r.accepted ? "accepted (stack empty at the end)" : "rejected"}
        />
      }
      controls={<TextField label="Brackets" value={text} onChange={setText} />}
    >
      <TraceTable
        head={["symbol", "stack after", "ok?"]}
        rows={r.steps.map((s) => [s.symbol, s.stack || "ε", s.ok ? "✓" : "✗"])}
      />
    </WidgetShell>
  );
}

/** A lexical analyser splitting source code into tokens. */
export function LexerWidget({ source, caption }: { source: string; caption: string }) {
  const [text, setText] = useState(source);
  const tokens = lex(text);
  const colors: Record<string, string> = {
    keyword: "#a855f7",
    identifier: "#3b82f6",
    number: "#10b981",
    operator: "#e1306c",
    punctuation: "#f59e0b",
  };
  return (
    <WidgetShell
      title="Lexical analysis"
      caption={caption}
      readouts={<Readout label="Tokens" value={String(tokens.length)} />}
      controls={<TextField label="Source code" value={text} onChange={setText} />}
    >
      <div className="flex flex-wrap gap-1.5 p-3 font-mono text-sm">
        {tokens.map((t, i) => (
          <span
            key={i}
            className="flex flex-col items-center rounded-md border border-border px-2 py-1"
          >
            <span>{t.text}</span>
            <span className="text-[10px]" style={{ color: colors[t.kind] }}>
              {t.kind}
            </span>
          </span>
        ))}
      </div>
    </WidgetShell>
  );
}

/** Three-address code for an assignment. */
export function ThreeAddress({ statement, caption }: { statement: string; caption: string }) {
  const [text, setText] = useState(statement);
  const code = useMemo(() => {
    try {
      return text.includes("=") ? threeAddressCode(text) : [];
    } catch {
      return [];
    }
  }, [text]);
  return (
    <WidgetShell
      title="Intermediate code: three-address code"
      caption={caption}
      readouts={
        <Readout label="Temporaries" value={String(code.filter((c) => c.startsWith("t")).length)} />
      }
      controls={
        <TextField label="Assignment, e.g. a = b + c * d" value={text} onChange={setText} />
      }
    >
      <ol className="flex flex-col gap-1 p-3 font-mono text-sm">
        {code.map((c, i) => (
          <li key={i}>
            <span className="text-muted">{i + 1}.</span> {c}
          </li>
        ))}
      </ol>
    </WidgetShell>
  );
}

type ShapeT = "Shape" | "Circle" | "Square";

/** Static type vs dynamic type: which overriding method runs. */
export function DispatchExplorer({ caption }: { caption: string }) {
  const [declared, setDeclared] = useState<ShapeT>("Shape");
  const [actual, setActual] = useState<ShapeT>("Circle");
  const legal = declared === "Shape" || declared === actual;
  return (
    <WidgetShell
      title="Polymorphism and dynamic dispatch"
      caption={caption}
      readouts={
        <>
          <Readout label="Code" value={`${declared} s = new ${actual}();`} />
          <Readout label="s.area() runs" value={legal ? `${actual}.area()` : "compile error"} />
          <Readout
            label="s.describe() (not overridden) runs"
            value={legal ? "Shape.describe()" : "—"}
          />
        </>
      }
      controls={
        <>
          <span className="text-sm sm:col-span-2">Declared (static) type of the variable:</span>
          <Choice
            options={["Shape", "Circle", "Square"] as const}
            value={declared}
            onChange={setDeclared}
          />
          <span className="text-sm sm:col-span-2">Object actually created (dynamic type):</span>
          <Choice
            options={["Circle", "Square"] as const}
            value={actual === "Shape" ? "Circle" : actual}
            onChange={setActual}
          />
        </>
      }
    >
      <div className="flex flex-col items-center gap-2 p-3 font-mono text-sm">
        <span className="rounded-md border-2 border-primary px-3 py-1">
          Shape · area() · describe()
        </span>
        <span aria-hidden="true">▲ extends ▲</span>
        <div className="flex gap-3">
          {(["Circle", "Square"] as const).map((c) => (
            <span
              key={c}
              className={`rounded-md border-2 px-3 py-1 ${c === actual ? "border-[#e1306c] bg-[#e1306c]/10" : "border-border"}`}
            >
              {c} · area()
            </span>
          ))}
        </div>
        {!legal && (
          <p className="text-danger">
            A {declared} variable can&apos;t hold a {actual}: they are siblings, not parent and
            child.
          </p>
        )}
      </div>
    </WidgetShell>
  );
}

/** References, aliasing and garbage: which objects can still be reached. */
export function ObjectReferences({ caption }: { caption: string }) {
  const [a, setA] = useState<"obj1" | "obj2" | "null">("obj1");
  const [b, setB] = useState<"obj1" | "obj2" | "null">("obj1");
  const reachable = new Set([a, b].filter((x) => x !== "null"));
  return (
    <WidgetShell
      title="Object references and garbage collection"
      caption={caption}
      readouts={
        <>
          <Readout
            label="Aliased?"
            value={a !== "null" && a === b ? "yes: a and b point to the same object" : "no"}
          />
          <Readout
            label="Garbage"
            value={
              (["obj1", "obj2"] as const).filter((o) => !reachable.has(o)).join(", ") || "none"
            }
          />
        </>
      }
      controls={
        <>
          <span className="text-sm sm:col-span-2">a points to:</span>
          <Choice options={["obj1", "obj2", "null"] as const} value={a} onChange={setA} />
          <span className="text-sm sm:col-span-2">b points to:</span>
          <Choice options={["obj1", "obj2", "null"] as const} value={b} onChange={setB} />
        </>
      }
    >
      <div className="grid grid-cols-2 gap-6 p-4 text-center font-mono text-sm">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted">stack (variables)</span>
          <span className="rounded border border-border px-2 py-1">a → {a}</span>
          <span className="rounded border border-border px-2 py-1">b → {b}</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted">heap (objects)</span>
          {(["obj1", "obj2"] as const).map((o) => (
            <span
              key={o}
              className={`rounded border px-2 py-1 ${reachable.has(o) ? "border-success" : "border-danger text-danger line-through"}`}
            >
              {o}
            </span>
          ))}
        </div>
      </div>
    </WidgetShell>
  );
}

/** Basic COCOMO estimate. */
export function CocomoWidget({
  kloc: k0,
  mode: m0,
  caption,
}: {
  kloc: number;
  mode: keyof typeof COCOMO_MODES;
  caption: string;
}) {
  const [kloc, setKloc] = useState(k0);
  const [mode, setMode] = useState(m0);
  const r = cocomo(kloc, mode);
  return (
    <WidgetShell
      title={`Basic COCOMO (${mode})`}
      caption={caption}
      readouts={
        <>
          <Readout label="Effort a·KLOC^b" value={`${r.effort.toFixed(1)} person-months`} />
          <Readout label="Time c·E^d" value={`${r.time.toFixed(1)} months`} />
          <Readout label="Average team" value={`${r.staff.toFixed(1)} people`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Size"
            value={kloc}
            min={1}
            max={500}
            step={1}
            unit="KLOC"
            onChange={setKloc}
          />
          <Choice
            options={Object.keys(COCOMO_MODES) as (keyof typeof COCOMO_MODES)[]}
            value={mode}
            onChange={setMode}
          />
        </>
      }
    >
      <p className="p-3 text-sm text-muted">
        Constants for {mode}: a = {COCOMO_MODES[mode].a}, b = {COCOMO_MODES[mode].b}, c ={" "}
        {COCOMO_MODES[mode].c}, d = {COCOMO_MODES[mode].d}.
      </p>
    </WidgetShell>
  );
}

const CFGS = {
  "if-else": { label: "if … else", nodes: 4, edges: 4, decisions: 1 },
  "while-loop": { label: "while loop", nodes: 4, edges: 4, decisions: 1 },
  "if-in-loop": { label: "if inside a loop", nodes: 6, edges: 7, decisions: 2 },
  "switch-3": { label: "switch with 3 cases", nodes: 5, edges: 6, decisions: 2 },
} as const;

/** Cyclomatic complexity of small control-flow graphs. */
export function CyclomaticWidget({
  program,
  caption,
}: {
  program: keyof typeof CFGS;
  caption: string;
}) {
  const [p, setP] = useState(program);
  const g = CFGS[p];
  return (
    <WidgetShell
      title="Cyclomatic complexity"
      caption={caption}
      readouts={
        <>
          <Readout
            label="V(G) = E − N + 2"
            value={`${g.edges} − ${g.nodes} + 2 = ${cyclomatic(g.edges, g.nodes)}`}
          />
          <Readout label="Also = decisions + 1" value={String(g.decisions + 1)} />
          <Readout label="Minimum test paths" value={String(cyclomatic(g.edges, g.nodes))} />
        </>
      }
      controls={
        <Choice
          options={Object.keys(CFGS) as (keyof typeof CFGS)[]}
          value={p}
          onChange={setP}
          labels={Object.fromEntries(Object.entries(CFGS).map(([k, v]) => [k, v.label]))}
        />
      }
    >
      <p className="p-3 text-sm">
        {g.label}: {g.nodes} nodes, {g.edges} edges, {g.decisions} decision point
        {g.decisions > 1 ? "s" : ""}.
      </p>
    </WidgetShell>
  );
}

/** Function point estimate. */
export function FunctionPoints({ caption }: { caption: string }) {
  const [counts, setCounts] = useState({
    inputs: 5,
    outputs: 4,
    inquiries: 3,
    internalFiles: 2,
    externalFiles: 1,
  });
  const [tdi, setTdi] = useState(30);
  const r = functionPoints(counts, tdi);
  const labels: Record<keyof typeof FP_WEIGHTS, string> = {
    inputs: "External inputs",
    outputs: "External outputs",
    inquiries: "External inquiries",
    internalFiles: "Internal logical files",
    externalFiles: "External interface files",
  };
  return (
    <WidgetShell
      title="Function points"
      caption={caption}
      readouts={
        <>
          <Readout label="Unadjusted FP" value={String(r.ufp)} />
          <Readout label="Value adjustment" value={r.vaf.toFixed(2)} />
          <Readout label="Function points" value={r.fp.toFixed(1)} />
        </>
      }
      controls={
        <>
          {(Object.keys(FP_WEIGHTS) as (keyof typeof FP_WEIGHTS)[]).map((k) => (
            <Slider
              key={k}
              label={`${labels[k]} (×${FP_WEIGHTS[k]})`}
              value={counts[k]}
              min={0}
              max={20}
              step={1}
              unit=""
              onChange={(v) => setCounts((c) => ({ ...c, [k]: v }))}
            />
          ))}
          <Slider
            label="Total degree of influence (14 factors × 0–5)"
            value={tdi}
            min={0}
            max={70}
            step={1}
            unit=""
            onChange={setTdi}
          />
        </>
      }
    >
      <p className="p-3 text-sm text-muted">
        FP = UFP × (0.65 + 0.01 × TDI), with average-complexity weights.
      </p>
    </WidgetShell>
  );
}

/** An HTTP request and response. */
export function HttpExplorer({
  method: m0,
  status: s0,
  caption,
}: {
  method: "GET" | "POST" | "PUT" | "DELETE";
  status: number;
  caption: string;
}) {
  const [method, setMethod] = useState(m0);
  const codes = Object.keys(HTTP_STATUS).map(Number);
  const [status, setStatus] = useState(codes.includes(s0) ? s0 : 200);
  return (
    <WidgetShell
      title="HTTP request and response"
      caption={caption}
      readouts={
        <>
          <Readout label="Status" value={`${status} ${HTTP_STATUS[status]}`} />
          <Readout label="Class" value={statusClass(status)} />
          <Readout
            label="Safe / idempotent"
            value={
              method === "GET"
                ? "safe and idempotent"
                : method === "POST"
                  ? "neither"
                  : "idempotent"
            }
          />
        </>
      }
      controls={
        <>
          <Choice
            options={["GET", "POST", "PUT", "DELETE"] as const}
            value={method}
            onChange={setMethod}
          />
          <Choice
            options={codes.map(String)}
            value={String(status)}
            onChange={(v) => setStatus(Number(v))}
          />
        </>
      }
    >
      <div className="grid gap-2 p-3 font-mono text-xs sm:grid-cols-2 sm:text-sm">
        <pre className="overflow-x-auto rounded-lg bg-surface-2 p-2">{`${method} /api/notes HTTP/1.1\nHost: example.com\nAccept: application/json${method === "POST" || method === "PUT" ? '\nContent-Type: application/json\n\n{"title":"Unit 3"}' : ""}`}</pre>
        <pre className="overflow-x-auto rounded-lg bg-surface-2 p-2">{`HTTP/1.1 ${status} ${HTTP_STATUS[status]}\nContent-Type: application/json${status === 301 ? "\nLocation: /api/v2/notes" : ""}`}</pre>
      </div>
    </WidgetShell>
  );
}

function DomTreeNode({ node }: { node: DomNode }) {
  return (
    <li className="ml-4 border-l border-border pl-2">
      <span className={`font-mono text-sm ${node.tag === "#text" ? "text-muted" : "text-primary"}`}>
        {node.tag === "#text" ? `"${node.text}"` : `<${node.tag}>`}
      </span>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c, i) => (
            <DomTreeNode key={i} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** The DOM tree of a small HTML snippet. */
export function DomTree({ html, caption }: { html: string; caption: string }) {
  const [text, setText] = useState(html);
  const tree = parseHtml(text);
  const count = (n: DomNode): number => 1 + n.children.reduce((s, c) => s + count(c), 0);
  return (
    <WidgetShell
      title="The DOM tree"
      caption={caption}
      readouts={<Readout label="Nodes" value={String(count(tree) - 1)} />}
      controls={<TextField label="HTML" value={text} onChange={setText} />}
    >
      <ul className="p-3">
        {tree.children.map((c, i) => (
          <DomTreeNode key={i} node={c} />
        ))}
      </ul>
    </WidgetShell>
  );
}

/** The CSS box model. */
export function BoxModel({
  content: c0,
  padding: p0,
  border: b0,
  margin: m0,
  caption,
}: {
  content: number;
  padding: number;
  border: number;
  margin: number;
  caption: string;
}) {
  const [c, setC] = useState(c0);
  const [p, setP] = useState(p0);
  const [b, setB] = useState(b0);
  const [m, setM] = useState(m0);
  const r = boxWidth(c, p, b, m);
  return (
    <WidgetShell
      title="CSS box model"
      caption={caption}
      readouts={
        <>
          <Readout label="Border-box width" value={`${r.borderBox}px`} />
          <Readout label="Space taken (with margin)" value={`${r.total}px`} />
        </>
      }
      controls={
        <>
          <Slider
            label="width (content)"
            value={c}
            min={40}
            max={240}
            step={10}
            unit="px"
            onChange={setC}
          />
          <Slider label="padding" value={p} min={0} max={40} step={2} unit="px" onChange={setP} />
          <Slider label="border" value={b} min={0} max={12} step={1} unit="px" onChange={setB} />
          <Slider label="margin" value={m} min={0} max={40} step={2} unit="px" onChange={setM} />
        </>
      }
    >
      <div className="grid place-items-center p-3">
        <div className="bg-[#f59e0b]/25 text-[10px]" style={{ padding: m / 2 }}>
          <div style={{ border: `${b / 2}px solid var(--fg)` }}>
            <div className="bg-[#10b981]/25" style={{ padding: p / 2 }}>
              <div
                className="grid h-12 place-items-center bg-[#3b82f6]/30 text-xs"
                style={{ width: c / 2 }}
              >
                content
              </div>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          Shown at half size: margin (orange), border, padding (green), content (blue).
        </p>
      </div>
    </WidgetShell>
  );
}

const SAMPLE_POINTS: Pt[] = [
  { x: 1, y: 2.2 },
  { x: 2, y: 2.8 },
  { x: 3, y: 4.5 },
  { x: 4, y: 4.9 },
  { x: 5, y: 6.1 },
  { x: 6, y: 7.2 },
];

/** Linear regression fitted by gradient descent, with the cost going down. */
export function GradientDescentWidget({
  learningRate,
  caption,
}: {
  learningRate: number;
  caption: string;
}) {
  const [rate, setRate] = useState(learningRate);
  const [steps, setSteps] = useState(20);
  const path = gradientDescent(SAMPLE_POINTS, rate, steps);
  const end = path.at(-1)!;
  const ls = leastSquares(SAMPLE_POINTS);
  const scale = makeGraphScale({ xMin: 0, xMax: 7, yMin: 0, yMax: 9 });
  const diverged = !Number.isFinite(end.cost) || end.cost > 1e6;
  return (
    <WidgetShell
      title="Gradient descent for linear regression"
      caption={caption}
      readouts={
        <>
          <Readout
            label="Line now"
            value={diverged ? "diverged" : `y = ${end.w.toFixed(2)}x + ${end.b.toFixed(2)}`}
          />
          <Readout
            label="Best (least squares)"
            value={`y = ${ls.w.toFixed(2)}x + ${ls.b.toFixed(2)}`}
          />
          <Readout label="Cost (MSE)" value={diverged ? "∞" : end.cost.toFixed(3)} />
        </>
      }
      controls={
        <>
          <Slider
            label="Learning rate α"
            value={rate}
            min={0.001}
            max={0.09}
            step={0.001}
            unit=""
            format={(v) => v.toFixed(3)}
            onChange={setRate}
          />
          <Slider
            label="Iterations"
            value={steps}
            min={0}
            max={300}
            step={5}
            unit=""
            onChange={setSteps}
          />
        </>
      }
    >
      <Graph scale={scale} label="Data points and the current fitted line">
        {SAMPLE_POINTS.map((p, i) => (
          <circle key={i} cx={scale.sx(p.x)} cy={scale.sy(p.y)} r={5} fill="#e1306c" />
        ))}
        {!diverged && (
          <line
            x1={scale.sx(0)}
            y1={scale.sy(end.b)}
            x2={scale.sx(7)}
            y2={scale.sy(end.w * 7 + end.b)}
            stroke="var(--primary)"
            strokeWidth={3}
          />
        )}
        <line
          x1={scale.sx(0)}
          y1={scale.sy(ls.b)}
          x2={scale.sx(7)}
          y2={scale.sy(ls.w * 7 + ls.b)}
          stroke="var(--muted)"
          strokeDasharray="6 5"
          strokeWidth={1.5}
        />
      </Graph>
      <Legend
        items={[
          { color: "var(--primary)", label: "gradient descent's line" },
          { color: "var(--muted)", label: "least-squares answer", dashed: true },
        ]}
      />
    </WidgetShell>
  );
}

const CLUSTER_POINTS: Pt[] = [
  { x: 1, y: 1 },
  { x: 1.5, y: 2 },
  { x: 2, y: 1.2 },
  { x: 6, y: 6 },
  { x: 6.5, y: 7 },
  { x: 7, y: 6.2 },
  { x: 2, y: 6 },
  { x: 1.5, y: 7 },
  { x: 2.5, y: 6.5 },
  { x: 1.2, y: 1.6 },
  { x: 6.8, y: 6.8 },
  { x: 2.2, y: 7.2 },
];
const CLUSTER_COLORS = ["#3b82f6", "#e1306c", "#10b981", "#f59e0b"];

/** k-means clustering, iteration by iteration. */
export function KMeansWidget({ k: k0, caption }: { k: number; caption: string }) {
  const [k, setK] = useState(k0);
  const history = useMemo(() => kMeans(CLUSTER_POINTS, k), [k]);
  const [i, setI] = useState(0);
  const at = history[Math.min(i, history.length - 1)];
  const scale = makeGraphScale({ xMin: 0, xMax: 8, yMin: 0, yMax: 8 });
  return (
    <WidgetShell
      title={`k-means (k = ${k})`}
      caption={caption}
      readouts={<Readout label="Iterations to converge" value={String(history.length)} />}
      controls={
        <>
          <Slider
            label="k (clusters)"
            value={k}
            min={1}
            max={4}
            step={1}
            unit=""
            onChange={(v) => {
              setK(v);
              setI(0);
            }}
          />
          <StepNav index={Math.min(i, history.length - 1)} count={history.length} onChange={setI} />
        </>
      }
    >
      <Graph scale={scale} label={`Points coloured by cluster at iteration ${i + 1}`}>
        {CLUSTER_POINTS.map((p, j) => (
          <circle
            key={j}
            cx={scale.sx(p.x)}
            cy={scale.sy(p.y)}
            r={6}
            fill={CLUSTER_COLORS[at.assign[j]]}
          />
        ))}
        {at.centroids.map((c, j) => (
          <text
            key={j}
            x={scale.sx(c.x)}
            y={scale.sy(c.y) + 6}
            textAnchor="middle"
            fontSize="20"
            fontWeight="bold"
            fill={CLUSTER_COLORS[j]}
          >
            ×
          </text>
        ))}
      </Graph>
      <Legend items={[{ color: "var(--fg)", label: "× = centroid (mean of its points)" }]} />
    </WidgetShell>
  );
}

const MAZE = ["S.....#...", ".####.#.#.", "......#.#.", ".####...#G", "........#."];

/** A* against breadth-first search on a grid. */
export function GridSearch({ heuristic, caption }: { heuristic: boolean; caption: string }) {
  const [useH, setUseH] = useState(heuristic);
  const r = gridSearch(MAZE, useH);
  const [i, setI] = useState(r.visited.length - 1);
  const k = Math.min(i, r.visited.length - 1);
  const seen = new Set(r.visited.slice(0, k + 1));
  const onPath = new Set(k === r.visited.length - 1 ? r.path : []);
  return (
    <WidgetShell
      title={useH ? "A* search (Manhattan heuristic)" : "Breadth-first (uniform-cost) search"}
      caption={caption}
      readouts={
        <>
          <Readout label="Cells explored" value={String(r.visited.length)} />
          <Readout label="Path length" value={r.length >= 0 ? String(r.length) : "no path"} />
        </>
      }
      controls={
        <>
          <div className="flex gap-2 sm:col-span-2">
            <WidgetButton
              onClick={() => {
                setUseH(true);
                setI(999);
              }}
            >
              A*
            </WidgetButton>
            <WidgetButton
              onClick={() => {
                setUseH(false);
                setI(999);
              }}
            >
              Breadth-first
            </WidgetButton>
          </div>
          <StepNav index={k} count={r.visited.length} onChange={setI} />
        </>
      }
    >
      <div
        className="grid gap-0.5 p-3"
        style={{ gridTemplateColumns: `repeat(${MAZE[0].length}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`Explored ${seen.size} cells`}
      >
        {MAZE.flatMap((row, r0) =>
          row.split("").map((ch, c0) => {
            const key = `${r0},${c0}`;
            const cls =
              ch === "#"
                ? "bg-fg/70"
                : onPath.has(key)
                  ? "bg-[#e1306c]"
                  : seen.has(key)
                    ? "bg-primary/40"
                    : "bg-surface-2";
            return (
              <span
                key={key}
                className={`grid aspect-square place-items-center rounded-sm text-[10px] font-bold ${cls}`}
              >
                {ch === "S" || ch === "G" ? ch : ""}
              </span>
            );
          }),
        )}
      </div>
    </WidgetShell>
  );
}

/** Entropy and information gain for a decision-tree split. */
export function EntropyWidget({
  yes: y0,
  no: n0,
  caption,
}: {
  yes: number;
  no: number;
  caption: string;
}) {
  const [yes, setYes] = useState(y0);
  const [no, setNo] = useState(n0);
  const [leftYes, setLeftYes] = useState(Math.min(6, y0));
  const [leftNo, setLeftNo] = useState(Math.min(2, n0));
  const ly = Math.min(leftYes, yes);
  const ln = Math.min(leftNo, no);
  const gain = informationGain(
    [yes, no],
    [
      [ly, ln],
      [yes - ly, no - ln],
    ].filter((c) => c[0] + c[1] > 0),
  );
  const scale = makeGraphScale({ xMin: 0, xMax: 1, yMin: 0, yMax: 1.05 });
  const p = yes + no ? yes / (yes + no) : 0;
  return (
    <WidgetShell
      title="Entropy and information gain"
      caption={caption}
      readouts={
        <>
          <Readout label="Entropy of the parent" value={entropy([yes, no]).toFixed(3)} />
          <Readout label="Information gain of the split" value={gain.toFixed(3)} />
        </>
      }
      controls={
        <>
          <Slider
            label="Parent: yes"
            value={yes}
            min={0}
            max={20}
            step={1}
            unit=""
            onChange={setYes}
          />
          <Slider
            label="Parent: no"
            value={no}
            min={0}
            max={20}
            step={1}
            unit=""
            onChange={setNo}
          />
          <Slider
            label="Left branch: yes"
            value={ly}
            min={0}
            max={yes}
            step={1}
            unit=""
            onChange={setLeftYes}
          />
          <Slider
            label="Left branch: no"
            value={ln}
            min={0}
            max={no}
            step={1}
            unit=""
            onChange={setLeftNo}
          />
        </>
      }
    >
      <Graph scale={scale} label="Entropy against the proportion of yes">
        <polyline
          points={Array.from({ length: 101 }, (_, i) => {
            const q = i / 100;
            return `${scale.sx(q)},${scale.sy(entropy([q, 1 - q]))}`;
          }).join(" ")}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={3}
        />
        <circle cx={scale.sx(p)} cy={scale.sy(entropy([yes, no]))} r={6} fill="#e1306c" />
      </Graph>
      <Legend
        items={[{ color: "var(--primary)", label: "entropy is highest (1 bit) at a 50:50 split" }]}
      />
    </WidgetShell>
  );
}
