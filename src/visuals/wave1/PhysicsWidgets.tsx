"use client";

import { useState } from "react";
import { fmt } from "@/visuals/mathTools";
import { Readout, Slider, WidgetButton, WidgetShell } from "@/visuals/ui";
import { Curve, Graph, Legend, makeGraphScale } from "@/visuals/widgets/math/Graph";
import {
  boxEnergyEv,
  boxProbability,
  boxPsi,
  dampedDisplacement,
  dampingKind,
  drivenAmplitude,
  fringeWidth,
  harmonicFrequency,
  nodes,
  qualityFactor,
  slitIntensity,
  standingWave,
} from "@/visuals/wave1/physicsModels";

/** Damped oscillations in time, and the resonance curve of the same oscillator when driven. */
export function Oscillator({
  omega0: w0Start,
  gamma: gammaStart,
  view: viewStart,
  caption,
}: {
  omega0: number;
  gamma: number;
  view: "time" | "resonance";
  caption: string;
}) {
  const [w0, setW0] = useState(w0Start);
  const [gamma, setGamma] = useState(gammaStart);
  const [view, setView] = useState(viewStart);
  const kind = dampingKind(w0, gamma);
  const q = qualityFactor(w0, gamma);
  const time = makeGraphScale({ xMin: 0, xMax: 10, yMin: -1.1, yMax: 1.1 });
  const peak = Math.max(
    ...Array.from({ length: 200 }, (_, i) =>
      drivenAmplitude((i / 100) * w0, w0, Math.max(gamma, 0.02)),
    ),
  );
  const res = makeGraphScale({ xMin: 0, xMax: 2 * w0, yMin: 0, yMax: peak * 1.1 });
  return (
    <WidgetShell
      title="Damped and driven oscillator"
      caption={caption}
      readouts={
        <>
          <Readout label="Natural ω₀" value={`${w0} rad/s`} />
          <Readout label="Damping" value={kind} />
          <Readout label="Quality factor Q" value={Number.isFinite(q) ? fmt(q) : "∞"} />
          <Readout label="Period T = 2π/ω₀" value={`${fmt((2 * Math.PI) / w0)} s`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Natural frequency ω₀"
            value={w0}
            min={1}
            max={6}
            step={0.1}
            unit="rad/s"
            onChange={setW0}
          />
          <Slider
            label="Damping γ = b/2m"
            value={gamma}
            min={0}
            max={8}
            step={0.05}
            unit="1/s"
            onChange={setGamma}
          />
          <div className="flex gap-2 sm:col-span-2">
            <WidgetButton onClick={() => setView("time")}>Motion in time</WidgetButton>
            <WidgetButton onClick={() => setView("resonance")}>Resonance curve</WidgetButton>
          </div>
        </>
      }
    >
      {view === "time" ? (
        <Graph scale={time} label={`Displacement against time, ${kind} damping`}>
          <Curve scale={time} f={(t) => dampedDisplacement(t, 1, w0, gamma)} />
          {gamma > 0 && (
            <Curve
              scale={time}
              f={(t) => Math.exp(-gamma * t)}
              color="var(--muted)"
              width={1.5}
              dashed
            />
          )}
        </Graph>
      ) : (
        <Graph scale={res} label="Amplitude against driving frequency">
          <Curve
            scale={res}
            f={(w) => drivenAmplitude(w, w0, Math.max(gamma, 0.02))}
            color="#e1306c"
          />
        </Graph>
      )}
      <Legend
        items={
          view === "time"
            ? [
                { color: "var(--primary)", label: "x(t), released from rest" },
                { color: "var(--muted)", label: "envelope e^(−γt)", dashed: true },
              ]
            : [
                {
                  color: "#e1306c",
                  label: "steady-state amplitude (peaks near ω₀ when damping is light)",
                },
              ]
        }
      />
    </WidgetShell>
  );
}

/** A standing wave on a string fixed at both ends, harmonic by harmonic. */
export function StandingWave({
  harmonic: nStart,
  length,
  tension,
  massPerLength,
  caption,
}: {
  harmonic: number;
  length: number;
  tension: number;
  massPerLength: number;
  caption: string;
}) {
  const [n, setN] = useState(nStart);
  const [phase, setPhase] = useState(0);
  const f = harmonicFrequency(n, length, tension, massPerLength);
  const scale = makeGraphScale({ xMin: 0, xMax: length, yMin: -2.4, yMax: 2.4 });
  return (
    <WidgetShell
      title="Standing waves on a string"
      caption={caption}
      readouts={
        <>
          <Readout label="Harmonic n" value={String(n)} />
          <Readout label="Wavelength λ = 2L/n" value={`${fmt((2 * length) / n)} m`} />
          <Readout label="Frequency f = nv/2L" value={`${fmt(f)} Hz`} />
          <Readout label="Nodes" value={String(n + 1)} />
        </>
      }
      controls={
        <>
          <Slider label="Harmonic n" value={n} min={1} max={8} step={1} unit="" onChange={setN} />
          <Slider
            label="Moment in the cycle (ωt)"
            value={phase}
            min={0}
            max={360}
            step={5}
            unit="°"
            onChange={setPhase}
          />
        </>
      }
    >
      <Graph scale={scale} label={`Harmonic ${n}: ${n + 1} nodes and ${n} antinodes`}>
        <Curve
          scale={scale}
          f={(x) => standingWave(x, 0, n, length, 1, 1)}
          color="var(--muted)"
          width={1.5}
          dashed
        />
        <Curve
          scale={scale}
          f={(x) => -standingWave(x, 0, n, length, 1, 1)}
          color="var(--muted)"
          width={1.5}
          dashed
        />
        <Curve scale={scale} f={(x) => standingWave(x, (phase * Math.PI) / 180, n, length, 1, 1)} />
        {nodes(n, length).map((x) => (
          <circle key={x} cx={scale.sx(x)} cy={scale.sy(0)} r={5} fill="#e1306c" />
        ))}
      </Graph>
      <Legend
        items={[
          { color: "var(--primary)", label: "string now" },
          { color: "var(--muted)", label: "envelope", dashed: true },
          { color: "#e1306c", label: "nodes (never move)" },
        ]}
      />
    </WidgetShell>
  );
}

/** Interference and diffraction pattern of N slits on a far screen. */
export function SlitPattern({
  slits: nStart,
  widthUm,
  spacingUm,
  wavelengthNm,
  caption,
}: {
  slits: number;
  widthUm: number;
  spacingUm: number;
  wavelengthNm: number;
  caption: string;
}) {
  const [n, setN] = useState(nStart);
  const [lambda, setLambda] = useState(wavelengthNm);
  const [d, setD] = useState(spacingUm);
  const a = Math.min(widthUm, d * 0.95);
  const maxSin = Math.min(1, (3.2 * lambda * 1e-9) / (a * 1e-6));
  const scale = makeGraphScale({ xMin: -maxSin, xMax: maxSin, yMin: 0, yMax: 1.05 });
  const hue = 270 - ((lambda - 400) / 300) * 270;
  return (
    <WidgetShell
      title={
        n === 1
          ? "Single-slit diffraction"
          : n === 2
            ? "Double-slit interference"
            : `Grating with ${n} slits`
      }
      caption={caption}
      readouts={
        <>
          <Readout label="Slits N" value={String(n)} />
          <Readout label="Wavelength" value={`${lambda} nm`} />
          <Readout label="First minimum sinθ = λ/a" value={fmt((lambda * 1e-9) / (a * 1e-6))} />
          <Readout
            label="Fringe width at 1 m (λD/d)"
            value={n > 1 ? `${fmt(fringeWidth(lambda * 1e-9, 1, d * 1e-6) * 1000)} mm` : "—"}
          />
        </>
      }
      controls={
        <>
          <Slider
            label="Number of slits"
            value={n}
            min={1}
            max={8}
            step={1}
            unit=""
            onChange={setN}
          />
          <Slider
            label="Wavelength λ"
            value={lambda}
            min={400}
            max={700}
            step={10}
            unit="nm"
            onChange={setLambda}
          />
          {n > 1 && (
            <Slider
              label="Slit spacing d"
              value={d}
              min={2}
              max={40}
              step={1}
              unit="µm"
              onChange={setD}
            />
          )}
        </>
      }
    >
      <Graph scale={scale} label={`Relative intensity against sin θ for ${n} slits`}>
        <Curve
          scale={scale}
          f={(s) => slitIntensity(s, n, a * 1e-6, d * 1e-6, lambda * 1e-9)}
          color={`hsl(${hue} 85% 50%)`}
        />
        {n > 1 && (
          <Curve
            scale={scale}
            f={(s) => slitIntensity(s, 1, a * 1e-6, 0, lambda * 1e-9)}
            color="var(--muted)"
            width={1.5}
            dashed
          />
        )}
      </Graph>
      <Legend
        items={[
          { color: `hsl(${hue} 85% 50%)`, label: "intensity on the screen" },
          ...(n > 1
            ? [{ color: "var(--muted)", label: "single-slit envelope", dashed: true }]
            : []),
        ]}
      />
    </WidgetShell>
  );
}

/** Particle in a one-dimensional box: wave functions, probabilities and energy levels. */
export function QuantumBox({
  level: nStart,
  widthNm,
  caption,
}: {
  level: number;
  widthNm: number;
  caption: string;
}) {
  const [n, setN] = useState(nStart);
  const [width, setWidth] = useState(widthNm);
  const [show, setShow] = useState<"psi" | "prob">("psi");
  const top = show === "psi" ? 1.5 : 2.1;
  const scale = makeGraphScale({
    xMin: -0.1,
    xMax: 1.1,
    yMin: show === "psi" ? -top : 0,
    yMax: top,
  });
  const e = boxEnergyEv(n, width * 1e-9);
  return (
    <WidgetShell
      title="Particle in a box"
      caption={caption}
      readouts={
        <>
          <Readout label="Level n" value={String(n)} />
          <Readout label="Energy Eₙ = n²h²/8mL²" value={`${fmt(e)} eV`} />
          <Readout label="E₁ (ground state)" value={`${fmt(boxEnergyEv(1, width * 1e-9))} eV`} />
          <Readout label="P(left half)" value={fmt(boxProbability(n, 0, 0.5, 1))} />
        </>
      }
      controls={
        <>
          <Slider
            label="Quantum number n"
            value={n}
            min={1}
            max={6}
            step={1}
            unit=""
            onChange={setN}
          />
          <Slider
            label="Box width L (electron)"
            value={width}
            min={0.2}
            max={3}
            step={0.1}
            unit="nm"
            onChange={setWidth}
          />
          <div className="flex gap-2 sm:col-span-2">
            <WidgetButton onClick={() => setShow("psi")}>Wave function ψ</WidgetButton>
            <WidgetButton onClick={() => setShow("prob")}>Probability |ψ|²</WidgetButton>
          </div>
        </>
      }
    >
      <Graph
        scale={scale}
        label={`${show === "psi" ? "Wave function" : "Probability density"} for level ${n}`}
      >
        <Curve
          scale={scale}
          f={(x) => (show === "psi" ? boxPsi(n, x, 1) : boxPsi(n, x, 1) ** 2)}
          color={show === "psi" ? "var(--primary)" : "#10b981"}
        />
        <line
          x1={scale.sx(0)}
          x2={scale.sx(0)}
          y1={scale.sy(scale.bounds.yMin)}
          y2={scale.sy(top)}
          stroke="var(--fg)"
          strokeWidth={4}
        />
        <line
          x1={scale.sx(1)}
          x2={scale.sx(1)}
          y1={scale.sy(scale.bounds.yMin)}
          y2={scale.sy(top)}
          stroke="var(--fg)"
          strokeWidth={4}
        />
      </Graph>
      <Legend
        items={[
          {
            color: show === "psi" ? "var(--primary)" : "#10b981",
            label: "x from 0 to L (walls in black)",
          },
        ]}
      />
    </WidgetShell>
  );
}
