"use client";

import { useState } from "react";
import { Markdown } from "@/components/lesson/Markdown";
import { isRunnable, runCode, type RunResult } from "@/lib/labs/runner";
import type { SectionValue } from "@/lib/labs/sections";

/*
 * Programming lab parts (syllabus fix, Phase 7C): code examples explained line by line, a free
 * in-browser "Run this code" box (Python, JavaScript, SQL), a dry run that steps through the code
 * with the variables (and pointer boxes) changing, practice problems with hidden solutions, and
 * common errors with their fixes.
 */

type Example = SectionValue<"code">[number];

const LANGUAGE_NAMES: Record<string, string> = {
  c: "C",
  cpp: "C++",
  java: "Java",
  python: "Python",
  javascript: "JavaScript",
  sql: "SQL",
  shell: "Shell",
  matlab: "MATLAB",
  arduino: "Arduino",
  verilog: "Verilog",
  html: "HTML",
  other: "Code",
};

function lineSet(spec: string | null): Set<number> {
  if (!spec) return new Set();
  const [a, b] = spec.split("-").map(Number);
  return new Set(Array.from({ length: (b ?? a) - a + 1 }, (_, i) => a + i));
}

/** Code with line numbers; `lit` lines are highlighted. */
export function CodeBlock({
  code,
  lit = new Set<number>(),
}: {
  code: string;
  lit?: ReadonlySet<number>;
}) {
  return (
    <pre
      className="overflow-x-auto rounded-xl border border-border bg-surface-2 py-2 font-mono text-sm leading-relaxed"
      data-testid="code-block"
    >
      <code>
        {code.split("\n").map((line, i) => (
          <span
            key={i}
            data-line={i + 1}
            data-lit={lit.has(i + 1) || undefined}
            className={`block pr-3 ${lit.has(i + 1) ? "bg-primary-soft" : ""}`}
          >
            <span className="inline-block w-9 pr-3 text-right text-muted select-none">{i + 1}</span>
            {line || " "}
          </span>
        ))}
      </code>
    </pre>
  );
}

function RunBox({ example }: { example: Example }) {
  const [code, setCode] = useState(example.code);
  const [input, setInput] = useState(example.input ?? "");
  const [state, setState] = useState<{ stage: "idle" | "loading" | "running" } | RunResult>({
    stage: "idle",
  });
  if (!isRunnable(example.language)) return null;
  const language = example.language;
  const busy = "stage" in state && state.stage !== "idle";
  return (
    <details className="rounded-xl border border-border bg-surface p-3" data-testid="run-box">
      <summary className="cursor-pointer font-semibold">
        ▶ Run this code (in your browser, free)
      </summary>
      <div className="mt-3 flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">Code (you can edit it)</span>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={Math.min(16, code.split("\n").length + 1)}
            spellCheck={false}
            className="rounded-lg border border-border bg-surface-2 p-2 font-mono text-sm"
          />
        </label>
        {language !== "sql" && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Input (one value per line)</span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              className="rounded-lg border border-border bg-surface-2 p-2 font-mono text-sm"
            />
          </label>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setState({ stage: "running" });
              const result = await runCode(language, code, input, (stage) => setState({ stage }));
              setState(result);
            }}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-50"
          >
            {busy ? "Running…" : "Run"}
          </button>
          <button
            type="button"
            onClick={() => {
              setCode(example.code);
              setInput(example.input ?? "");
              setState({ stage: "idle" });
            }}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
          >
            Reset
          </button>
          {"stage" in state && state.stage === "loading" && (
            <span className="text-sm text-muted" role="status">
              Loading {LANGUAGE_NAMES[language]} in your browser (first time only)…
            </span>
          )}
        </div>
        {"ok" in state && (
          <pre
            className={`overflow-x-auto rounded-lg border p-2 font-mono text-sm ${state.ok ? "border-border bg-surface-2" : "border-danger/50 bg-danger/10"}`}
            data-testid="run-output"
            role="status"
          >
            {state.output || (state.ok ? "(no output)" : "")}
            {state.error ? `${state.output ? "\n" : ""}${state.error}` : ""}
          </pre>
        )}
      </div>
    </details>
  );
}

export function CodeExamples({ examples }: { examples: SectionValue<"code"> }) {
  return (
    <ol className="flex flex-col gap-5">
      {examples.map((ex, i) => (
        <CodeExampleView key={i} n={i + 1} example={ex} />
      ))}
    </ol>
  );
}

function CodeExampleView({ n, example }: { n: number; example: Example }) {
  const [focus, setFocus] = useState<string | null>(null);
  return (
    <li className="flex flex-col gap-2" data-testid="code-example">
      <h3 className="font-semibold">
        Example {n}: {example.title}{" "}
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">
          {LANGUAGE_NAMES[example.language]}
        </span>
      </h3>
      <CodeBlock code={example.code} lit={lineSet(focus)} />
      <ul className="flex flex-col gap-1 text-sm">
        {example.explanation.map((e, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => setFocus(focus === e.lines ? null : e.lines)}
              aria-pressed={focus === e.lines}
              className={`flex w-full gap-2 rounded-lg px-2 py-1 text-left ${focus === e.lines ? "bg-primary-soft" : "hover:bg-surface-2"}`}
            >
              <span className="w-16 shrink-0 font-mono font-semibold text-muted">
                {e.lines.includes("-") ? "Lines" : "Line"} {e.lines}
              </span>
              <span className="min-w-0 flex-1">
                <Markdown>{e.text}</Markdown>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {example.input && (
        <p className="text-sm">
          <b>Input:</b> <code className="font-mono">{example.input}</code>
        </p>
      )}
      <div className="text-sm">
        <p className="font-semibold">Expected output</p>
        <pre
          className="overflow-x-auto rounded-lg bg-surface-2 p-2 font-mono"
          data-testid="expected-output"
        >
          {example.output || "(nothing printed)"}
        </pre>
      </div>
      <RunBox example={example} />
      {!isRunnable(example.language) && (
        <p className="text-xs text-muted">
          Compile and run it in your lab ({LANGUAGE_NAMES[example.language]}); you should see the
          output above.
        </p>
      )}
    </li>
  );
}

/** A dry run: one line at a time, with every variable's value and pointer boxes. */
export function TraceView({
  trace,
  examples,
}: {
  trace: SectionValue<"trace">;
  examples: SectionValue<"code">;
}) {
  const [i, setI] = useState(0);
  const ex = examples[trace.example];
  if (!ex) return null;
  const step = trace.steps[i];
  const output = trace.steps
    .slice(0, i + 1)
    .map((s) => s.output)
    .filter(Boolean)
    .join("\n");
  const prev =
    i > 0
      ? new Map(trace.steps[i - 1].vars.map((v) => [v.name, v.value]))
      : new Map<string, string>();
  return (
    <div className="flex flex-col gap-3" data-testid="trace">
      <p className="text-sm text-muted">
        Following Example {trace.example + 1}: {ex.title}
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="min-w-0">
          <CodeBlock code={ex.code} lit={new Set([step.line])} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div
            className="rounded-xl border border-primary/40 bg-primary-soft/40 p-3"
            aria-live="polite"
          >
            <p className="text-sm font-semibold text-muted">
              Step {i + 1} of {trace.steps.length} · line {step.line}
            </p>
            <p>{step.note}</p>
          </div>
          {step.vars.length > 0 && (
            <table className="w-full border-collapse text-sm" data-testid="trace-vars">
              <thead>
                <tr className="bg-surface-2">
                  <th className="border border-border px-2 py-1 text-left">Variable</th>
                  <th className="border border-border px-2 py-1 text-left">Value</th>
                </tr>
              </thead>
              <tbody>
                {step.vars.map((v) => {
                  const changed = prev.get(v.name) !== v.value;
                  return (
                    <tr key={v.name} className={changed ? "bg-primary-soft/60" : undefined}>
                      <td className="border border-border px-2 py-1 font-mono">{v.name}</td>
                      <td className="border border-border px-2 py-1 font-mono font-semibold">
                        {v.value}
                        {changed && i > 0 && (
                          <span className="ml-1 text-xs font-normal text-primary">changed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {step.memory && step.memory.length > 0 && <MemoryDiagram boxes={step.memory} />}
          {output && (
            <div className="text-sm">
              <p className="font-semibold">Output so far</p>
              <pre className="rounded-lg bg-surface-2 p-2 font-mono">{output}</pre>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setI((x) => Math.max(0, x - 1))}
          disabled={i === 0}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => setI((x) => Math.min(trace.steps.length - 1, x + 1))}
          disabled={i === trace.steps.length - 1}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-40"
        >
          Next line →
        </button>
      </div>
    </div>
  );
}

type Box = NonNullable<SectionValue<"trace">["steps"][number]["memory"]>[number];

/** Memory as boxes in a row; a pointer's arrow curves to the box it points to. */
function MemoryDiagram({ boxes }: { boxes: Box[] }) {
  const BW = 96;
  const GAP = 24;
  const W = Math.max(boxes.length * (BW + GAP) + GAP, 200);
  const x = (i: number) => GAP + i * (BW + GAP);
  const index = new Map(boxes.map((b, i) => [b.name, i]));
  const arrows = boxes
    .map((b, i) => ({ from: i, to: b.pointsTo ? index.get(b.pointsTo) : undefined }))
    .filter((a): a is { from: number; to: number } => a.to !== undefined && a.to !== a.from);
  return (
    <div
      className="overflow-x-auto rounded-xl border border-border bg-surface"
      data-testid="memory-diagram"
    >
      <svg
        viewBox={`0 0 ${W} 150`}
        className="block min-w-[280px]"
        style={{ width: Math.max(W, 280) }}
        role="img"
        aria-label="Memory: boxes for variables, arrows for pointers"
      >
        <defs>
          <marker
            id="mem-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" fill="var(--primary)" />
          </marker>
        </defs>
        {arrows.map((a, k) => {
          const x1 = x(a.from) + BW / 2;
          const x2 = x(a.to) + BW / 2;
          return (
            <path
              key={k}
              d={`M${x1} 52 C${x1} ${10 - k * 6} ${x2} ${10 - k * 6} ${x2} 50`}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2}
              markerEnd="url(#mem-arrow)"
            />
          );
        })}
        {boxes.map((b, i) => (
          <g key={b.name}>
            <rect
              x={x(i)}
              y={56}
              width={BW}
              height={44}
              rx={6}
              fill="var(--surface-2)"
              stroke="var(--fg)"
              strokeWidth={1.5}
            />
            <text
              x={x(i) + BW / 2}
              y={84}
              textAnchor="middle"
              fontSize={14}
              fontWeight={700}
              fontFamily="monospace"
              fill="var(--fg)"
            >
              {b.value.length > 11 ? `${b.value.slice(0, 10)}…` : b.value}
            </text>
            <text
              x={x(i) + BW / 2}
              y={120}
              textAnchor="middle"
              fontSize={13}
              fontFamily="monospace"
              fill="var(--fg)"
            >
              {b.name}
            </text>
            {b.address && (
              <text
                x={x(i) + BW / 2}
                y={138}
                textAnchor="middle"
                fontSize={11}
                fontFamily="monospace"
                fill="var(--muted)"
              >
                {b.address}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function PracticeList({ items }: { items: SectionValue<"practice"> }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((p, i) => (
        <li
          key={i}
          className="flex flex-col gap-2 rounded-xl border border-border p-3"
          data-testid="practice"
        >
          <p className="font-semibold">Problem {i + 1}</p>
          <Markdown>{p.question}</Markdown>
          {p.hint && (
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-primary">
                Show a hint
              </summary>
              <div className="mt-1 text-sm">
                <Markdown>{p.hint}</Markdown>
              </div>
            </details>
          )}
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-primary">
              Show the solution
            </summary>
            <div className="mt-2">
              <Markdown>{p.solution}</Markdown>
            </div>
          </details>
        </li>
      ))}
    </ol>
  );
}

export function FixList({ items }: { items: SectionValue<"fixes"> }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((f, i) => (
        <li key={i} className="rounded-xl border border-border p-3">
          <p className="font-mono text-sm font-semibold text-danger">{f.problem}</p>
          <div className="mt-1 text-sm">
            <Markdown>{f.fix}</Markdown>
          </div>
        </li>
      ))}
    </ul>
  );
}
