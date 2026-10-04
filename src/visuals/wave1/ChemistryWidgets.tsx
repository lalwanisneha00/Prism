"use client";

import { useState } from "react";
import { fmt } from "@/visuals/mathTools";
import { Readout, Slider, WidgetShell } from "@/visuals/ui";
import { Curve, Graph, Legend, makeGraphScale } from "@/visuals/widgets/math/Graph";
import {
  beerLambert,
  gibbsFromEmf,
  nernst,
  phaseRuleFreedom,
  WATER,
  waterMeltingT,
  waterPhase,
  waterVapourPressure,
} from "@/visuals/wave1/chemElecModels";

/** Beer–Lambert law: absorbance grows in a straight line with concentration. */
export function BeerLambert({
  epsilon: eStart,
  pathCm: lStart,
  concentration: cStart,
  caption,
}: {
  epsilon: number;
  pathCm: number;
  concentration: number;
  caption: string;
}) {
  const [eps, setEps] = useState(eStart);
  const [l, setL] = useState(lStart);
  const [c, setC] = useState(cStart);
  const { absorbance, transmittance } = beerLambert(eps, l, c);
  const cMax = 0.01;
  const scale = makeGraphScale({
    xMin: 0,
    xMax: cMax * 1000,
    yMin: 0,
    yMax: Math.max(0.5, eps * l * cMax * 1.05),
  });
  return (
    <WidgetShell
      title="Beer–Lambert law (A = εlc)"
      caption={caption}
      readouts={
        <>
          <Readout label="Absorbance A" value={fmt(absorbance)} />
          <Readout label="Transmittance T" value={`${fmt(transmittance * 100)} %`} />
          <Readout label="Light absorbed" value={`${fmt((1 - transmittance) * 100)} %`} />
          <Readout label="Concentration c" value={`${fmt(c * 1000)} mM`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Concentration c"
            value={c * 1000}
            min={0}
            max={10}
            step={0.1}
            unit="mM"
            onChange={(v) => setC(v / 1000)}
          />
          <Slider
            label="Path length l"
            value={l}
            min={0.1}
            max={5}
            step={0.1}
            unit="cm"
            onChange={setL}
          />
          <Slider
            label="Molar absorptivity ε"
            value={eps}
            min={10}
            max={500}
            step={10}
            unit="L/(mol·cm)"
            onChange={setEps}
          />
        </>
      }
    >
      <Graph
        scale={scale}
        label={`Absorbance ${fmt(absorbance)} at concentration ${fmt(c * 1000)} mM`}
      >
        <Curve scale={scale} f={(mm) => eps * l * (mm / 1000)} />
        <circle cx={scale.sx(c * 1000)} cy={scale.sy(absorbance)} r={7} fill="#e1306c" />
      </Graph>
      <Legend
        items={[
          {
            color: "var(--primary)",
            label: "A against c (mM): a straight line through the origin",
          },
        ]}
      />
    </WidgetShell>
  );
}

const PHASE_COLOR = {
  solid: "#3b82f6",
  liquid: "#10b981",
  vapour: "#f59e0b",
  supercritical: "#a855f7",
};

/** Water's phase diagram (log pressure): drag temperature and pressure to see the phase. */
export function PhaseDiagram({
  temperatureK: tStart,
  pressureKpa: pStart,
  caption,
}: {
  temperatureK: number;
  pressureKpa: number;
  caption: string;
}) {
  const [t, setT] = useState(tStart);
  const [logP, setLogP] = useState(Math.log10(pStart * 1000));
  const p = 10 ** logP;
  const phase = waterPhase(t, p);
  const scale = makeGraphScale({ xMin: 200, xMax: 750, yMin: 1, yMax: 8 });
  const onTriple =
    Math.abs(t - WATER.triple.t) < 1 && Math.abs(Math.log10(p / WATER.triple.p)) < 0.05;
  const phasesHere = onTriple ? 3 : 1;
  return (
    <WidgetShell
      title="Phase diagram of water"
      caption={caption}
      readouts={
        <>
          <Readout label="Phase" value={phase} />
          <Readout label="Temperature" value={`${t} K (${fmt(t - 273.15)} °C)`} />
          <Readout
            label="Pressure"
            value={p >= 1e6 ? `${fmt(p / 1e6)} MPa` : `${fmt(p / 1000)} kPa`}
          />
          <Readout label="Phase rule F = C − P + 2" value={`${phaseRuleFreedom(1, phasesHere)}`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Temperature T"
            value={t}
            min={200}
            max={750}
            step={1}
            unit="K"
            onChange={setT}
          />
          <Slider
            label="Pressure (log₁₀ Pa)"
            value={logP}
            min={1}
            max={8}
            step={0.02}
            unit=""
            format={(v) => v.toFixed(2)}
            onChange={setLogP}
          />
        </>
      }
    >
      <Graph scale={scale} label={`Water is ${phase} at ${t} K and ${fmt(p / 1000)} kPa`}>
        <Curve
          scale={scale}
          f={(tt) => (tt <= WATER.critical.t ? Math.log10(waterVapourPressure(tt)) : NaN)}
          color="#f59e0b"
        />
        {/* Melting line: almost vertical, leaning back from the triple point. */}
        <line
          x1={scale.sx(WATER.triple.t)}
          y1={scale.sy(Math.log10(WATER.triple.p))}
          x2={scale.sx(waterMeltingT(1e8))}
          y2={scale.sy(8)}
          stroke="#3b82f6"
          strokeWidth={3}
        />
        <circle
          cx={scale.sx(WATER.triple.t)}
          cy={scale.sy(Math.log10(WATER.triple.p))}
          r={5}
          fill="var(--fg)"
        />
        <circle
          cx={scale.sx(WATER.critical.t)}
          cy={scale.sy(Math.log10(WATER.critical.p))}
          r={5}
          fill="var(--fg)"
        />
        <circle
          cx={scale.sx(t)}
          cy={scale.sy(logP)}
          r={8}
          fill={PHASE_COLOR[phase]}
          stroke="var(--fg)"
        />
      </Graph>
      <Legend
        items={[
          { color: "#f59e0b", label: "boiling / sublimation line" },
          { color: "#3b82f6", label: "melting line (slopes backwards)" },
          {
            color: "var(--fg)",
            label: `triple point ${WATER.triple.t} K and critical point ${WATER.critical.t} K`,
          },
        ]}
      />
      <p className="px-3 pb-2 text-xs text-muted">
        Melting point at this pressure: {fmt(waterMeltingT(p))} K. Simplified curves through the
        real triple, boiling and critical points.
      </p>
    </WidgetShell>
  );
}

/** A galvanic cell and the Nernst equation: how the cell voltage changes with concentration. */
export function NernstCell({
  standardEmf,
  electrons,
  caption,
}: {
  standardEmf: number;
  electrons: number;
  caption: string;
}) {
  const [logQ, setLogQ] = useState(0);
  const [temp, setTemp] = useState(298);
  const q = 10 ** logQ;
  const e = nernst(standardEmf, electrons, q, temp);
  const scale = makeGraphScale({
    xMin: -4,
    xMax: 4,
    yMin: Math.min(0, standardEmf - 0.4),
    yMax: standardEmf + 0.4,
  });
  return (
    <WidgetShell
      title="Nernst equation: E = E° − (RT/nF) ln Q"
      caption={caption}
      readouts={
        <>
          <Readout label="Cell emf E" value={`${fmt(e)} V`} />
          <Readout label="E°" value={`${standardEmf} V`} />
          <Readout label="Reaction quotient Q" value={fmt(q)} />
          <Readout label="ΔG = −nFE" value={`${fmt(gibbsFromEmf(electrons, e) / 1000)} kJ/mol`} />
        </>
      }
      controls={
        <>
          <Slider
            label="log₁₀ Q (products ÷ reactants)"
            value={logQ}
            min={-4}
            max={4}
            step={0.1}
            unit=""
            format={(v) => v.toFixed(1)}
            onChange={setLogQ}
          />
          <Slider
            label="Temperature"
            value={temp}
            min={273}
            max={373}
            step={1}
            unit="K"
            onChange={setTemp}
          />
        </>
      }
    >
      <Graph scale={scale} label={`Cell voltage ${fmt(e)} volts at log Q ${logQ.toFixed(1)}`}>
        <Curve scale={scale} f={(lq) => nernst(standardEmf, electrons, 10 ** lq, temp)} />
        <circle cx={scale.sx(logQ)} cy={scale.sy(e)} r={7} fill="#e1306c" />
      </Graph>
      <Legend
        items={[
          {
            color: "var(--primary)",
            label: `E against log₁₀ Q (slope −${fmt((0.05916 * temp) / 298 / electrons)} V per decade)`,
          },
        ]}
      />
    </WidgetShell>
  );
}
