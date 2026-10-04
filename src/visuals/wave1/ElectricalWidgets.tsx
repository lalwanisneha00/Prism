"use client";

import { useState } from "react";
import { fmt } from "@/visuals/mathTools";
import { ArrowMarker, Readout, Slider, WidgetButton, WidgetShell } from "@/visuals/ui";
import { Curve, Graph, Legend, makeGraphScale } from "@/visuals/widgets/math/Graph";
import {
  firstOrderDecay,
  firstOrderRise,
  maxEfficiencyFraction,
  slipAtMaxTorque,
  synchronousSpeed,
  threePhase,
  torqueSlip,
  transformer,
} from "@/visuals/wave1/chemElecModels";

const PHASE_COLORS = ["#e1306c", "#f59e0b", "#3b82f6"];

/** Three-phase supply: the three waveforms, the phasor diagram, and star/delta relations. */
export function ThreePhase({
  lineVoltage,
  impedance,
  pfAngleDeg: angleStart,
  connection: connStart,
  caption,
}: {
  lineVoltage: number;
  impedance: number;
  pfAngleDeg: number;
  connection: "star" | "delta";
  caption: string;
}) {
  const [conn, setConn] = useState(connStart);
  const [angle, setAngle] = useState(angleStart);
  const [wt, setWt] = useState(0);
  const r = threePhase(conn, lineVoltage, impedance, angle);
  const scale = makeGraphScale({ xMin: 0, xMax: 720, yMin: -1.2, yMax: 1.2 });
  const cx = 110;
  const cy = 110;
  const R = 80;
  return (
    <WidgetShell
      title={`Three-phase supply (${conn})`}
      caption={caption}
      readouts={
        <>
          <Readout label="Phase voltage" value={`${fmt(r.vPhase)} V`} />
          <Readout label="Line current" value={`${fmt(r.iLine)} A`} />
          <Readout label="Phase current" value={`${fmt(r.iPhase)} A`} />
          <Readout label="Power √3·V_L·I_L·cosφ" value={`${fmt(r.power / 1000)} kW`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Power-factor angle φ"
            value={angle}
            min={0}
            max={80}
            step={1}
            unit="°"
            onChange={setAngle}
          />
          <Slider
            label="Moment in the cycle ωt"
            value={wt}
            min={0}
            max={360}
            step={5}
            unit="°"
            onChange={setWt}
          />
          <div className="flex gap-2 sm:col-span-2">
            <WidgetButton onClick={() => setConn("star")}>Star (Y)</WidgetButton>
            <WidgetButton onClick={() => setConn("delta")}>Delta (Δ)</WidgetButton>
          </div>
        </>
      }
    >
      <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
        <svg
          viewBox="0 0 220 220"
          className="mx-auto block w-full max-w-[220px]"
          role="img"
          aria-label="Phasor diagram of three voltages 120 degrees apart"
        >
          <defs>
            {PHASE_COLORS.map((c, i) => (
              <ArrowMarker key={c} id={`ph-${i}`} color={c} />
            ))}
          </defs>
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border)" />
          {[0, -120, -240].map((offset, i) => {
            const a = ((wt + offset) * Math.PI) / 180;
            return (
              <line
                key={offset}
                x1={cx}
                y1={cy}
                x2={cx + R * Math.cos(a)}
                y2={cy - R * Math.sin(a)}
                stroke={PHASE_COLORS[i]}
                strokeWidth={3}
                markerEnd={`url(#ph-${i})`}
              />
            );
          })}
          <text x={cx} y={214} textAnchor="middle" fontSize="11" fill="var(--muted)">
            R, Y, B: 120° apart
          </text>
        </svg>
        <Graph scale={scale} label="Three phase voltages over two cycles">
          {[0, 120, 240].map((offset, i) => (
            <Curve
              key={offset}
              scale={scale}
              f={(deg) => Math.sin(((deg - offset) * Math.PI) / 180)}
              color={PHASE_COLORS[i]}
              width={2}
            />
          ))}
          <line
            x1={scale.sx(wt)}
            x2={scale.sx(wt)}
            y1={scale.sy(-1.2)}
            y2={scale.sy(1.2)}
            stroke="var(--fg)"
            strokeDasharray="4 4"
          />
        </Graph>
      </div>
      <Legend
        items={[
          { color: PHASE_COLORS[0], label: "R phase" },
          { color: PHASE_COLORS[1], label: "Y phase (lags 120°)" },
          { color: PHASE_COLORS[2], label: "B phase (lags 240°)" },
        ]}
      />
    </WidgetShell>
  );
}

/** First-order RC or RL circuit: charging/rising and discharging/decaying with time constant τ. */
export function FirstOrderTransient({
  circuit: kindStart,
  supplyV,
  resistance,
  reactiveValue,
  caption,
}: {
  circuit: "RC" | "RL";
  supplyV: number;
  resistance: number;
  reactiveValue: number;
  caption: string;
}) {
  const [kind, setKind] = useState(kindStart);
  const [rOhm, setR] = useState(resistance);
  const [x, setX] = useState(reactiveValue);
  const [rising, setRising] = useState(true);
  // RC: x in µF → τ = RC; RL: x in mH → τ = L/R.
  const tau = kind === "RC" ? rOhm * x * 1e-6 : (x * 1e-3) / rOhm;
  const final = kind === "RC" ? supplyV : supplyV / rOhm;
  const tMax = 5 * tau;
  const scale = makeGraphScale({ xMin: 0, xMax: tMax * 1000, yMin: 0, yMax: final * 1.1 });
  const f = (ms: number) =>
    rising ? firstOrderRise(ms / 1000, final, tau) : firstOrderDecay(ms / 1000, final, tau);
  return (
    <WidgetShell
      title={`${kind} circuit transient`}
      caption={caption}
      readouts={
        <>
          <Readout label={kind === "RC" ? "τ = RC" : "τ = L/R"} value={`${fmt(tau * 1000)} ms`} />
          <Readout
            label={kind === "RC" ? "Final capacitor voltage" : "Final current"}
            value={kind === "RC" ? `${fmt(final)} V` : `${fmt(final * 1000)} mA`}
          />
          <Readout label="After 1τ" value={rising ? "63.2 %" : "36.8 %"} />
          <Readout label="Practically done after" value={`5τ = ${fmt(tMax * 1000)} ms`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Resistance R"
            value={rOhm}
            min={10}
            max={10000}
            step={10}
            unit="Ω"
            onChange={setR}
          />
          <Slider
            label={kind === "RC" ? "Capacitance C" : "Inductance L"}
            value={x}
            min={1}
            max={1000}
            step={1}
            unit={kind === "RC" ? "µF" : "mH"}
            onChange={setX}
          />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <WidgetButton onClick={() => setKind("RC")}>RC</WidgetButton>
            <WidgetButton onClick={() => setKind("RL")}>RL</WidgetButton>
            <WidgetButton onClick={() => setRising((v) => !v)}>
              {rising ? "Show switch-off (decay)" : "Show switch-on (rise)"}
            </WidgetButton>
          </div>
        </>
      }
    >
      <Graph
        scale={scale}
        label={`${kind} ${rising ? "rise" : "decay"} with time constant ${fmt(tau * 1000)} milliseconds`}
      >
        <Curve scale={scale} f={f} />
        <line
          x1={scale.sx(tau * 1000)}
          x2={scale.sx(tau * 1000)}
          y1={scale.sy(0)}
          y2={scale.sy(final * 1.1)}
          stroke="#e1306c"
          strokeDasharray="5 4"
        />
      </Graph>
      <Legend
        items={[
          {
            color: "var(--primary)",
            label:
              kind === "RC"
                ? "capacitor voltage (V) against time (ms)"
                : "current (A) against time (ms)",
          },
          { color: "#e1306c", label: "t = τ", dashed: true },
        ]}
      />
    </WidgetShell>
  );
}

/** A single-phase transformer: turns ratio, currents and efficiency against load. */
export function TransformerWidget({
  primaryV,
  primaryTurns,
  secondaryTurns,
  ratedKva,
  coreLossW,
  fullLoadCuLossW,
  caption,
}: {
  primaryV: number;
  primaryTurns: number;
  secondaryTurns: number;
  ratedKva: number;
  coreLossW: number;
  fullLoadCuLossW: number;
  caption: string;
}) {
  const [n2, setN2] = useState(secondaryTurns);
  const [load, setLoad] = useState(0.5);
  const [pf, setPf] = useState(0.8);
  const at = (fraction: number) =>
    transformer({
      v1: primaryV,
      n1: primaryTurns,
      n2,
      loadKw: fraction * ratedKva * pf,
      pf,
      coreLossW,
      fullLoadCuLossW,
      ratedKva,
    });
  const now = at(load);
  const best = maxEfficiencyFraction(coreLossW, fullLoadCuLossW);
  const scale = makeGraphScale({ xMin: 0, xMax: 1.25, yMin: 0.8, yMax: 1 });
  return (
    <WidgetShell
      title="Transformer"
      caption={caption}
      readouts={
        <>
          <Readout label="V₂ = V₁·N₂/N₁" value={`${fmt(now.v2)} V`} />
          <Readout label="I₁ / I₂" value={`${fmt(now.i1)} / ${fmt(now.i2)} A`} />
          <Readout label="Efficiency" value={`${fmt(now.efficiency * 100)} %`} />
          <Readout label="Best efficiency at" value={`${fmt(best * 100)} % load`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Secondary turns N₂"
            value={n2}
            min={10}
            max={primaryTurns * 2}
            step={10}
            unit=""
            onChange={setN2}
          />
          <Slider
            label="Load (fraction of rating)"
            value={load}
            min={0}
            max={1.25}
            step={0.05}
            unit=""
            format={(v) => `${Math.round(v * 100)}%`}
            onChange={setLoad}
          />
          <Slider
            label="Power factor"
            value={pf}
            min={0.5}
            max={1}
            step={0.05}
            unit=""
            format={(v) => v.toFixed(2)}
            onChange={setPf}
          />
        </>
      }
    >
      <Graph
        scale={scale}
        label={`Efficiency ${fmt(now.efficiency * 100)} percent at ${Math.round(load * 100)} percent load`}
      >
        <Curve scale={scale} f={(fr) => (fr > 0.01 ? at(fr).efficiency : NaN)} />
        <line
          x1={scale.sx(best)}
          x2={scale.sx(best)}
          y1={scale.sy(0.8)}
          y2={scale.sy(1)}
          stroke="#10b981"
          strokeDasharray="5 4"
        />
        {load > 0.01 && (
          <circle cx={scale.sx(load)} cy={scale.sy(now.efficiency)} r={7} fill="#e1306c" />
        )}
      </Graph>
      <Legend
        items={[
          { color: "var(--primary)", label: "efficiency against load fraction" },
          { color: "#10b981", label: "maximum where copper loss = core loss", dashed: true },
        ]}
      />
    </WidgetShell>
  );
}

/** Induction motor torque–slip (and torque–speed) characteristic. */
export function TorqueSlip({
  rotorResistance,
  rotorReactance,
  poles,
  frequency,
  caption,
}: {
  rotorResistance: number;
  rotorReactance: number;
  poles: number;
  frequency: number;
  caption: string;
}) {
  const [r2, setR2] = useState(rotorResistance);
  const [slip, setSlip] = useState(0.05);
  const x2 = rotorReactance;
  const ns = synchronousSpeed(frequency, poles);
  const sMax = Math.min(1, slipAtMaxTorque(r2, x2));
  const scale = makeGraphScale({ xMin: 0, xMax: 1, yMin: 0, yMax: 1.1 });
  return (
    <WidgetShell
      title="Induction motor: torque against slip"
      caption={caption}
      readouts={
        <>
          <Readout label="Synchronous speed 120f/P" value={`${fmt(ns)} rpm`} />
          <Readout label="Rotor speed N = Nₛ(1 − s)" value={`${fmt(ns * (1 - slip))} rpm`} />
          <Readout label="Torque (÷ maximum)" value={fmt(torqueSlip(slip, r2, x2))} />
          <Readout label="Slip at maximum torque" value={fmt(slipAtMaxTorque(r2, x2))} />
        </>
      }
      controls={
        <>
          <Slider
            label="Slip s"
            value={slip}
            min={0}
            max={1}
            step={0.01}
            unit=""
            format={(v) => v.toFixed(2)}
            onChange={setSlip}
          />
          <Slider
            label="Rotor resistance R₂"
            value={r2}
            min={0.02}
            max={1.5}
            step={0.02}
            unit="Ω"
            format={(v) => v.toFixed(2)}
            onChange={setR2}
          />
        </>
      }
    >
      <Graph
        scale={scale}
        label={`Torque ${fmt(torqueSlip(slip, r2, x2))} of maximum at slip ${slip.toFixed(2)}`}
      >
        <Curve scale={scale} f={(s) => torqueSlip(s, r2, x2)} />
        <line
          x1={scale.sx(sMax)}
          x2={scale.sx(sMax)}
          y1={scale.sy(0)}
          y2={scale.sy(1.1)}
          stroke="#10b981"
          strokeDasharray="5 4"
        />
        <circle cx={scale.sx(slip)} cy={scale.sy(torqueSlip(slip, r2, x2))} r={7} fill="#e1306c" />
      </Graph>
      <Legend
        items={[
          {
            color: "var(--primary)",
            label: "torque against slip (s = 0 synchronous, s = 1 standstill)",
          },
          { color: "#10b981", label: "s = R₂/X₂ (maximum torque)", dashed: true },
        ]}
      />
    </WidgetShell>
  );
}
