"use client";

import { useMemo, useState } from "react";
import { ApparatusDiagram } from "@/components/labs/ApparatusDiagram";
import {
  ConnectionView,
  LiveGraph,
  SchematicView,
  unitOf,
} from "@/components/labs/circuit/CircuitViews";
import { ProcedurePlayer } from "@/components/labs/ProcedureSteps";
import { Markdown } from "@/components/lesson/Markdown";
import { layoutCircuit } from "@/lib/labs/circuit/layout";
import {
  formatSI,
  METER_TYPES,
  SOURCE_TYPES,
  type Circuit,
  type CircuitComponent,
} from "@/lib/labs/circuit/model";
import {
  describeWire,
  solveCircuit,
  sweep,
  valueOf,
  type Overrides,
} from "@/lib/labs/circuit/solve";
import { circuitStepTargets } from "@/lib/labs/stepTargets";
import { Readout, Slider } from "@/visuals/ui";

/*
 * A lab circuit students can play with (syllabus fix, Phase 7C): the circuit diagram or the
 * connection view, sliders for the values they change in the lab, live meter readings and a live
 * graph, all computed in the browser by Prism's own solver.
 */

type Tab = "diagram" | "bench";

const MAX_SLIDERS = 4;

/** Values a student can change: the ones the lesson gave a range, else sources and rheostats. */
function adjustable(circuit: Circuit): CircuitComponent[] {
  // Switches are on/off buttons, meters only read: neither gets a slider.
  const given = circuit.components.filter(
    (c) => c.adjust && c.type !== "switch" && !METER_TYPES.has(c.type),
  );
  if (given.length) return given.slice(0, MAX_SLIDERS);
  return circuit.components
    .filter((c) => SOURCE_TYPES.has(c.type) || c.type === "rheostat")
    .slice(0, MAX_SLIDERS);
}

function range(c: CircuitComponent): [number, number] {
  if (c.adjust) return [c.adjust.min, c.adjust.max];
  const v = valueOf(c);
  return [0, v * 2];
}

/** What a slider changes, in the student's words. */
function sliderLabel(c: CircuitComponent): string {
  if (c.type === "solar-cell") return `${c.label}: light level (short-circuit current)`;
  if (c.type === "rheostat" || c.type === "potentiometer") return `${c.label}: resistance`;
  if (SOURCE_TYPES.has(c.type)) return `${c.label}: output`;
  return c.label;
}

/** A circuit that failed the checks twice: its parts and wires as a labelled diagram. */
export function CircuitFallback({ circuit }: { circuit: Circuit }) {
  const ids = (ref: string) =>
    ref
      .split(".")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="flex flex-col gap-2" data-testid="circuit-fallback">
      <ApparatusDiagram
        apparatus={{
          parts: circuit.components.map((c) => ({ id: ids(c.id), label: `${c.id}: ${c.label}` })),
          links: circuit.connections.map((w) => ({
            from: ids(w.from),
            to: ids(w.to),
            kind: "wire" as const,
          })),
        }}
      />
      <p className="text-sm text-muted">
        Prism couldn&apos;t check this circuit fully, so it is shown as a labelled diagram. Follow
        your lab manual&apos;s circuit when you wire it.
      </p>
    </div>
  );
}

export function CircuitLab({ circuit }: { circuit: Circuit }) {
  const schematic = useMemo(() => layoutCircuit(circuit), [circuit]);
  const [tab, setTab] = useState<Tab>(schematic ? "diagram" : "bench");
  const [overrides, setOverrides] = useState<Overrides>({});
  const solution = useMemo(() => solveCircuit(circuit, overrides), [circuit, overrides]);
  const curve = useMemo(
    () => (solution.ok ? sweep(circuit, overrides) : []),
    [circuit, overrides, solution.ok],
  );
  const sliders = adjustable(circuit);
  const switches = circuit.components.filter((c) => c.type === "switch");
  const acSource = circuit.components.find((c) => c.frequency !== undefined);
  const meters = circuit.components.filter((c) => METER_TYPES.has(c.type));
  const set = (id: string, patch: Overrides[string]) =>
    setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } }));

  const plot = circuit.plot;
  const unitFor = (id: string) => {
    if (plot && id === plot.sweep && id === plot.x)
      return plot.param === "frequency"
        ? "Hz"
        : unitOf(circuit.components.find((c) => c.id === id)?.type ?? "");
    return solution.ok ? (solution.readings[id]?.unit ?? "") : "";
  };
  const at =
    plot && solution.ok
      ? {
          x:
            plot.x === plot.sweep
              ? plot.param === "frequency"
                ? (overrides[plot.sweep]?.frequency ?? acSource?.frequency ?? 0)
                : valueOf(
                    circuit.components.find((c) => c.id === plot.sweep)!,
                    overrides[plot.sweep],
                  )
              : (solution.readings[plot.x]?.value ?? NaN),
          y: solution.readings[plot.y]?.value ?? NaN,
        }
      : undefined;

  return (
    <figure
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3 sm:p-4"
      data-testid="circuit-lab"
    >
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Circuit view">
        {schematic && (
          <TabButton on={tab === "diagram"} onClick={() => setTab("diagram")}>
            Circuit diagram
          </TabButton>
        )}
        <TabButton on={tab === "bench"} onClick={() => setTab("bench")}>
          Connection view
        </TabButton>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {tab === "diagram" && schematic ? (
          <SchematicView
            schematic={schematic}
            circuit={circuit}
            readings={solution.ok ? solution.readings : undefined}
          />
        ) : (
          <ConnectionView circuit={circuit} />
        )}
      </div>
      {tab === "bench" && (
        <ol className="grid gap-1 text-sm sm:grid-cols-2">
          {circuit.connections.map((_, k) => (
            <li key={k}>
              <span className="font-semibold">{k + 1}.</span> {describeWire(circuit, k)}
            </li>
          ))}
        </ol>
      )}

      {solution.ok ? (
        <>
          {meters.length > 0 && (
            <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4" aria-live="polite">
              {meters.map((m) => {
                const r = solution.readings[m.id];
                return (
                  <Readout
                    key={m.id}
                    label={`${m.id} · ${m.label}`}
                    value={r ? `${formatSI(r.value, r.unit)}${solution.ac ? " rms" : ""}` : "—"}
                  />
                );
              })}
            </dl>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {sliders.map((c) => {
              const [lo, hi] = range(c);
              const unit = unitOf(c.type);
              return (
                <Slider
                  key={c.id}
                  label={sliderLabel(c)}
                  value={valueOf(c, overrides[c.id])}
                  min={lo}
                  max={hi}
                  step={(hi - lo) / 200}
                  unit=""
                  format={(v) => formatSI(v, unit)}
                  onChange={(v) => set(c.id, { value: v })}
                />
              );
            })}
            {acSource && (
              <Slider
                label={`${acSource.label}: frequency`}
                value={Math.log10(overrides[acSource.id]?.frequency ?? acSource.frequency ?? 50)}
                min={Math.log10((acSource.frequency ?? 50) / 20)}
                max={Math.log10((acSource.frequency ?? 50) * 20)}
                step={0.01}
                unit=""
                format={(v) => formatSI(10 ** v, "Hz")}
                onChange={(v) => set(acSource.id, { frequency: 10 ** v })}
              />
            )}
          </div>
          {switches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {switches.map((s) => {
                const closed = overrides[s.id]?.closed !== false;
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={closed}
                    onClick={() => set(s.id, { closed: !closed })}
                    className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface"
                  >
                    {s.label}: {closed ? "closed (on)" : "open (off)"}
                  </button>
                );
              })}
            </div>
          )}
          {plot && curve.length > 1 && (
            <div className="rounded-lg border border-border bg-surface p-2">
              <LiveGraph
                points={curve}
                at={at}
                xLabel={plot.xLabel}
                yLabel={plot.yLabel}
                xUnit={unitFor(plot.x)}
                yUnit={unitFor(plot.y)}
              />
            </div>
          )}
          {solution.approximate && (
            <p className="text-sm text-muted">
              Diodes in an AC circuit are shown as switched off, so readings are approximate.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-muted" data-testid="circuit-no-sim">
          {solution.reason === "unsupported"
            ? "Live readings aren't available for circuits with transistors, ICs or boards. Use the diagram and the wiring steps."
            : "Prism couldn't compute readings for these values. Try different values."}
        </p>
      )}
      <figcaption className="text-sm text-muted">
        {solution.ok
          ? "Drawn and solved by Prism from the lesson's list of parts and wires. Change the values to see the meters and the graph respond."
          : "Drawn by Prism from the lesson's list of parts and wires."}
      </figcaption>
    </figure>
  );
}

function TabButton({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold ${on ? "bg-primary text-primary-fg" : "border border-border hover:bg-surface"}`}
    >
      {children}
    </button>
  );
}

/** Building the circuit wire by wire: each step adds and highlights its wires. */
export function WiringSteps({ circuit }: { circuit: Circuit }) {
  const [step, setStep] = useState(0);
  const schematic = useMemo(() => layoutCircuit(circuit), [circuit]);
  const [view, setView] = useState<Tab>("bench");
  const steps = circuit.wiring;
  const shown = new Set(steps.slice(0, step + 1).flatMap((s) => s.connections));
  const current = steps[step].connections;
  const lit = [
    ...new Set(
      current
        .flatMap((k) => [circuit.connections[k]?.from, circuit.connections[k]?.to])
        .filter(Boolean)
        .map((r) => r!.split(".")[0]),
    ),
  ];
  return (
    <div className="flex flex-col gap-3" data-testid="wiring-steps">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Wiring view">
        <TabButton on={view === "bench"} onClick={() => setView("bench")}>
          On the bench
        </TabButton>
        {schematic && (
          <TabButton on={view === "diagram"} onClick={() => setView("diagram")}>
            On the circuit diagram
          </TabButton>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {view === "diagram" && schematic ? (
          <SchematicView schematic={schematic} circuit={circuit} lit={lit} />
        ) : (
          <ConnectionView circuit={circuit} shown={shown} current={current} />
        )}
      </div>
      <div
        className="rounded-xl border border-primary/40 bg-primary-soft/40 p-3"
        aria-live="polite"
      >
        <p className="text-sm font-semibold text-muted">
          Step {step + 1} of {steps.length}
        </p>
        <Markdown>{steps[step].text}</Markdown>
        <ul className="mt-1 text-sm text-muted">
          {current.map((k) => (
            <li key={k}>
              Wire {k + 1}: {describeWire(circuit, k)}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
          disabled={step === steps.length - 1}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-40"
        >
          Next wire →
        </button>
      </div>
    </div>
  );
}

/**
 * The procedure over the circuit (syllabus fix, Phase 7C fixes): each step lights up the parts it
 * uses on the circuit diagram (the bench view when the circuit can't be laid out), with the
 * meters showing what they read at the lesson's starting values.
 */
export function CircuitProcedure({
  steps,
  circuit,
  playLabel,
}: {
  steps: readonly { text: string; parts: readonly string[] }[];
  /** A lesson's circuit; `fallback` when it failed the checks (drawn as a labelled diagram). */
  circuit: Circuit & { fallback?: boolean };
  playLabel?: string;
}) {
  const schematic = useMemo(() => (circuit.fallback ? null : layoutCircuit(circuit)), [circuit]);
  const solution = useMemo(() => solveCircuit(circuit, {}), [circuit]);
  const targets = useMemo(() => steps.map((s) => circuitStepTargets(s, circuit)), [steps, circuit]);
  const label = (id: string) => {
    const c = circuit.components.find((x) => x.id === id);
    return c ? `${c.id} ${c.label}` : id;
  };
  return (
    <ProcedurePlayer
      steps={steps}
      playLabel={playLabel}
      uses={(i) => targets[i].map(label)}
      hint="The parts each step uses light up on the circuit diagram."
      diagram={(i) => {
        const lit = i === null ? [] : targets[i];
        if (circuit.fallback) return <CircuitFallback circuit={circuit} />;
        return (
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {schematic ? (
              <SchematicView
                schematic={schematic}
                circuit={circuit}
                lit={lit}
                readings={solution.ok ? solution.readings : undefined}
              />
            ) : (
              <ConnectionView
                circuit={circuit}
                current={circuit.connections
                  .map((w, k) => ({ w, k }))
                  .filter(({ w }) =>
                    lit.some((id) => w.from.startsWith(`${id}.`) || w.to.startsWith(`${id}.`)),
                  )
                  .map(({ k }) => k)}
              />
            )}
          </div>
        );
      }}
    />
  );
}
