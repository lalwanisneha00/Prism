"use client";

import { useState } from "react";
import { fmt } from "@/visuals/mathTools";
import { Readout, Slider, WidgetButton, WidgetShell } from "@/visuals/ui";
import { Curve, Graph, Legend, makeGraphScale } from "@/visuals/widgets/math/Graph";
import {
  diodeCurrent,
  fullAdder,
  gate,
  loadLine,
  opAmpGain,
  opAmpOutput,
  rectified,
  rectifierDc,
  type Gate,
} from "@/visuals/wave1/chemElecModels";

/** The diode V–I curve, and what a half-wave, full-wave or bridge rectifier does to a sine. */
export function DiodeRectifier({
  peakV: peakStart,
  mode: modeStart,
  caption,
}: {
  peakV: number;
  mode: "curve" | "half" | "full" | "bridge";
  caption: string;
}) {
  const [mode, setMode] = useState(modeStart);
  const [peak, setPeak] = useState(peakStart);
  const curve = makeGraphScale({ xMin: -1, xMax: 0.9, yMin: -2, yMax: 20 });
  const wave = makeGraphScale({ xMin: 0, xMax: 720, yMin: -peak * 1.1, yMax: peak * 1.1 });
  const kind = mode === "curve" ? "half" : mode;
  const vin = (deg: number) => peak * Math.sin((deg * Math.PI) / 180);
  return (
    <WidgetShell
      title={
        mode === "curve"
          ? "Diode V–I characteristic"
          : `${mode === "half" ? "Half-wave" : mode === "full" ? "Centre-tap full-wave" : "Bridge"} rectifier`
      }
      caption={caption}
      readouts={
        mode === "curve" ? (
          <>
            <Readout label="Current at 0.6 V" value={`${fmt(diodeCurrent(0.6) * 1000)} mA`} />
            <Readout label="Current at 0.7 V" value={`${fmt(diodeCurrent(0.7) * 1000)} mA`} />
            <Readout label="Reverse current" value="≈ Iₛ (10⁻¹⁴ A)" />
            <Readout label="Knee (silicon)" value="≈ 0.7 V" />
          </>
        ) : (
          <>
            <Readout label="Input peak" value={`${peak} V`} />
            <Readout label="Output peak" value={`${fmt(rectified(kind, peak))} V`} />
            <Readout
              label="DC (average) ≈"
              value={`${fmt(rectifierDc(kind === "half" ? "half" : "full", peak))} V`}
            />
            <Readout label="Ripple frequency" value={kind === "half" ? "f" : "2f"} />
          </>
        )
      }
      controls={
        <>
          {mode !== "curve" && (
            <Slider
              label="Input peak voltage"
              value={peak}
              min={2}
              max={24}
              step={1}
              unit="V"
              onChange={setPeak}
            />
          )}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <WidgetButton onClick={() => setMode("curve")}>V–I curve</WidgetButton>
            <WidgetButton onClick={() => setMode("half")}>Half-wave</WidgetButton>
            <WidgetButton onClick={() => setMode("full")}>Full-wave</WidgetButton>
            <WidgetButton onClick={() => setMode("bridge")}>Bridge</WidgetButton>
          </div>
        </>
      }
    >
      {mode === "curve" ? (
        <Graph scale={curve} label="Diode current in milliamps against voltage">
          <Curve scale={curve} f={(v) => diodeCurrent(v) * 1000} />
        </Graph>
      ) : (
        <Graph scale={wave} label={`Rectifier output for a ${peak} volt peak sine`}>
          <Curve scale={wave} f={vin} color="var(--muted)" width={1.5} dashed />
          <Curve scale={wave} f={(deg) => rectified(kind, vin(deg))} color="#10b981" />
        </Graph>
      )}
      <Legend
        items={
          mode === "curve"
            ? [{ color: "var(--primary)", label: "current (mA) against voltage (V)" }]
            : [
                { color: "var(--muted)", label: "AC input", dashed: true },
                { color: "#10b981", label: "output across the load" },
              ]
        }
      />
    </WidgetShell>
  );
}

/** A CE amplifier's DC load line and Q-point with voltage-divider bias. */
export function LoadLine({
  vcc,
  rc,
  re,
  r1,
  r2,
  beta: betaStart,
  caption,
}: {
  vcc: number;
  rc: number;
  re: number;
  r1: number;
  r2: number;
  beta: number;
  caption: string;
}) {
  const [r2Now, setR2] = useState(r2);
  const [beta, setBeta] = useState(betaStart);
  const q = loadLine({ vcc, rc, re, r1, r2: r2Now, beta });
  const scale = makeGraphScale({ xMin: 0, xMax: vcc * 1.05, yMin: 0, yMax: q.icSat * 1000 * 1.15 });
  const region = q.cutoff ? "cut-off" : q.saturated ? "saturation" : "active (good for amplifying)";
  return (
    <WidgetShell
      title="BJT load line and Q-point"
      caption={caption}
      readouts={
        <>
          <Readout label="Q-point I_C" value={`${fmt(q.ic * 1000)} mA`} />
          <Readout label="Q-point V_CE" value={`${fmt(q.vce)} V`} />
          <Readout label="I_C(sat) = V_CC/(R_C+R_E)" value={`${fmt(q.icSat * 1000)} mA`} />
          <Readout label="Region" value={region} />
        </>
      }
      controls={
        <>
          <Slider
            label="Bias resistor R₂"
            value={r2Now}
            min={1000}
            max={30000}
            step={500}
            unit="Ω"
            onChange={setR2}
          />
          <Slider
            label="Current gain β"
            value={beta}
            min={20}
            max={400}
            step={10}
            unit=""
            onChange={setBeta}
          />
        </>
      }
    >
      <Graph
        scale={scale}
        label={`Q-point at ${fmt(q.vce)} volts and ${fmt(q.ic * 1000)} milliamps`}
      >
        <Curve scale={scale} f={(v) => ((vcc - v) / (rc + re)) * 1000} />
        <circle cx={scale.sx(q.vce)} cy={scale.sy(q.ic * 1000)} r={8} fill="#e1306c" />
      </Graph>
      <Legend
        items={[
          { color: "var(--primary)", label: "DC load line: I_C (mA) against V_CE (V)" },
          { color: "#e1306c", label: "Q-point" },
        ]}
      />
    </WidgetShell>
  );
}

/** Inverting and non-inverting op-amp amplifiers with output clipping at the rails. */
export function OpAmp({
  mode: modeStart,
  rf: rfStart,
  rin,
  rail,
  caption,
}: {
  mode: "inverting" | "non-inverting";
  rf: number;
  rin: number;
  rail: number;
  caption: string;
}) {
  const [mode, setMode] = useState(modeStart);
  const [rf, setRf] = useState(rfStart);
  const [vin, setVin] = useState(0.5);
  const gain = opAmpGain(mode, rf, rin);
  const scale = makeGraphScale({ xMin: 0, xMax: 720, yMin: -rail * 1.15, yMax: rail * 1.15 });
  const input = (deg: number) => vin * Math.sin((deg * Math.PI) / 180);
  const clipped = Math.abs(gain * vin) > rail;
  return (
    <WidgetShell
      title={`${mode === "inverting" ? "Inverting" : "Non-inverting"} amplifier`}
      caption={caption}
      readouts={
        <>
          <Readout
            label={mode === "inverting" ? "Gain = −R_f/R_in" : "Gain = 1 + R_f/R_in"}
            value={fmt(gain)}
          />
          <Readout label="Output peak" value={`${fmt(Math.min(Math.abs(gain * vin), rail))} V`} />
          <Readout label="Phase" value={mode === "inverting" ? "inverted (180°)" : "in phase"} />
          <Readout label="Clipping" value={clipped ? "yes: hits the supply" : "no"} />
        </>
      }
      controls={
        <>
          <Slider
            label="Feedback resistor R_f"
            value={rf}
            min={1000}
            max={100000}
            step={1000}
            unit="Ω"
            onChange={setRf}
          />
          <Slider
            label="Input peak"
            value={vin}
            min={0.05}
            max={3}
            step={0.05}
            unit="V"
            onChange={setVin}
          />
          <div className="flex gap-2 sm:col-span-2">
            <WidgetButton onClick={() => setMode("inverting")}>Inverting</WidgetButton>
            <WidgetButton onClick={() => setMode("non-inverting")}>Non-inverting</WidgetButton>
          </div>
        </>
      }
    >
      <Graph scale={scale} label={`Op-amp output with gain ${fmt(gain)}`}>
        <Curve scale={scale} f={input} color="var(--muted)" width={1.5} dashed />
        <Curve scale={scale} f={(deg) => opAmpOutput(gain, input(deg), rail)} color="#10b981" />
      </Graph>
      <Legend
        items={[
          { color: "var(--muted)", label: "input", dashed: true },
          { color: "#10b981", label: `output (supply ±${rail} V)` },
        ]}
      />
    </WidgetShell>
  );
}

const GATES: Gate[] = ["AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR"];

const bit = (v: boolean) => (v ? "1" : "0");

function Toggle({
  label,
  value,
  set,
}: {
  label: string;
  value: boolean;
  set: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => set(!value)}
      aria-pressed={value}
      className={`rounded-full border px-4 py-1.5 font-mono text-sm font-semibold ${value ? "border-success bg-success/15 text-success" : "border-border bg-surface"}`}
    >
      {label} = {bit(value)}
    </button>
  );
}

/** Logic gates with switchable inputs and live truth tables; and a full adder. */
export function LogicGates({
  gate: gateStart,
  caption,
}: {
  gate: Gate | "FULL-ADDER";
  caption: string;
}) {
  const [g, setG] = useState<Gate | "FULL-ADDER">(gateStart);
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const [cin, setCin] = useState(false);
  const rows: boolean[][] =
    g === "FULL-ADDER"
      ? [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [Boolean(i & 4), Boolean(i & 2), Boolean(i & 1)])
      : g === "NOT"
        ? [[false], [true]]
        : [
            [false, false],
            [false, true],
            [true, false],
            [true, true],
          ];
  const current = g === "FULL-ADDER" ? [a, b, cin] : g === "NOT" ? [a] : [a, b];
  const out = (r: boolean[]) => {
    if (g === "FULL-ADDER") {
      const s = fullAdder(r[0], r[1], r[2]);
      return `${bit(s.sum)} ${bit(s.carry)}`;
    }
    return bit(gate(g, r[0], r[1]));
  };
  const same = (r: boolean[]) => r.every((v, i) => v === current[i]);
  return (
    <WidgetShell
      title={g === "FULL-ADDER" ? "Full adder" : `${g} gate`}
      caption={caption}
      readouts={
        <>
          <Readout label="Inputs" value={current.map(bit).join(" ")} />
          <Readout label={g === "FULL-ADDER" ? "Sum, Carry" : "Output"} value={out(current)} />
        </>
      }
      controls={
        <div className="flex flex-col gap-2 sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            <Toggle label="A" value={a} set={setA} />
            {g !== "NOT" && <Toggle label="B" value={b} set={setB} />}
            {g === "FULL-ADDER" && <Toggle label="Cᵢₙ" value={cin} set={setCin} />}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...GATES, "FULL-ADDER" as const].map((x) => (
              <WidgetButton key={x} onClick={() => setG(x)}>
                {x === "FULL-ADDER" ? "Full adder" : x}
              </WidgetButton>
            ))}
          </div>
        </div>
      }
    >
      <table className="w-full text-center font-mono text-sm" aria-label={`Truth table for ${g}`}>
        <thead className="bg-surface-2">
          <tr>
            {(g === "FULL-ADDER" ? ["A", "B", "Cᵢₙ"] : g === "NOT" ? ["A"] : ["A", "B"]).map(
              (h) => (
                <th key={h} className="px-2 py-1">
                  {h}
                </th>
              ),
            )}
            <th className="px-2 py-1">{g === "FULL-ADDER" ? "Sum Carry" : "Out"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.map(bit).join("")}
              className={same(r) ? "bg-primary-soft font-bold text-primary" : ""}
            >
              {r.map((v, i) => (
                <td key={i} className="px-2 py-1">
                  {bit(v)}
                </td>
              ))}
              <td className="px-2 py-1">{out(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </WidgetShell>
  );
}
