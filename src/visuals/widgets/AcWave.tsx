"use client";

import { useState } from "react";
import { rms } from "@/visuals/physics";
import { Readout, Slider, WidgetShell } from "@/visuals/ui";

const W = 640;
const H = 280;
const PAD = 40;

/** An AC voltage over two cycles, its RMS value, and (optionally) a current that lags or leads. */
export function AcWave({
  amplitude: initialA,
  frequency: initialF,
  phaseDeg: initialPhase,
  showCurrent,
  caption,
}: {
  amplitude: number;
  frequency: number;
  phaseDeg: number;
  showCurrent: boolean;
  caption: string;
}) {
  const [amp, setAmp] = useState(initialA);
  const [freq, setFreq] = useState(initialF);
  const [phase, setPhase] = useState(initialPhase);
  const period = 1 / freq;
  const vRms = rms(amp);
  const maxAmp = 400;

  const x = (t: number) => PAD + (t / (2 * period)) * (W - 2 * PAD);
  const y = (v: number) => H / 2 - (v / maxAmp) * (H / 2 - 20);
  const wave = (shift: number, scale: number) =>
    Array.from({ length: 241 }, (_, i) => {
      const t = (i / 240) * 2 * period;
      return `${x(t).toFixed(1)},${y(scale * Math.sin(2 * Math.PI * freq * t + shift)).toFixed(1)}`;
    }).join(" ");

  return (
    <WidgetShell
      title="Alternating current"
      caption={caption}
      readouts={
        <>
          <Readout label="Peak V₀" value={`${amp} V`} />
          <Readout label="RMS = V₀/√2" value={`${vRms.toFixed(1)} V`} />
          <Readout label="Period T = 1/f" value={`${(period * 1000).toFixed(1)} ms`} />
          {showCurrent && (
            <Readout
              label="Current phase"
              value={phase === 0 ? "in phase" : phase < 0 ? `lags ${-phase}°` : `leads ${phase}°`}
            />
          )}
        </>
      }
      controls={
        <>
          <Slider
            label="Peak voltage V₀"
            value={amp}
            min={10}
            max={400}
            step={5}
            unit="V"
            onChange={setAmp}
          />
          <Slider
            label="Frequency f"
            value={freq}
            min={1}
            max={100}
            step={1}
            unit="Hz"
            onChange={setFreq}
          />
          {showCurrent && (
            <div className="sm:col-span-2">
              <Slider
                label="Current phase (− = lags, as in an inductor; + = leads, as in a capacitor)"
                value={phase}
                min={-90}
                max={90}
                step={5}
                unit="°"
                onChange={setPhase}
              />
            </div>
          )}
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`AC voltage with peak ${amp} volts, RMS ${vRms.toFixed(1)} volts, frequency ${freq} hertz`}
      >
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="var(--border)" />
        <line x1={PAD} y1={20} x2={PAD} y2={H - 20} stroke="var(--border)" />
        {[1, -1].map((s) => (
          <line
            key={s}
            x1={PAD}
            y1={y(s * vRms)}
            x2={W - PAD}
            y2={y(s * vRms)}
            stroke="#10b981"
            strokeDasharray="6 5"
          />
        ))}
        <text x={W - PAD} y={y(vRms) - 6} textAnchor="end" fill="#10b981" fontSize="12">
          ± V_rms
        </text>
        <polyline points={wave(0, amp)} fill="none" stroke="var(--primary)" strokeWidth="3" />
        {showCurrent && (
          <polyline
            points={wave((phase * Math.PI) / 180, amp * 0.6)}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2.5"
            strokeDasharray="8 4"
          />
        )}
        <text x={PAD + 6} y={30} fill="var(--primary)" fontSize="12">
          voltage
        </text>
        {showCurrent && (
          <text x={PAD + 70} y={30} fill="#f59e0b" fontSize="12">
            current (scaled)
          </text>
        )}
        <text x={W - PAD} y={H - 6} textAnchor="end" fill="var(--muted)" fontSize="11">
          time → (two cycles)
        </text>
      </svg>
    </WidgetShell>
  );
}
