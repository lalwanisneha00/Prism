"use client";

import { useEffect, useRef, useState } from "react";
import { coilEmf, coilFlux } from "@/visuals/physics";
import { Readout, Slider, WidgetButton, WidgetShell } from "@/visuals/ui";

const W = 640;
const H = 340;
const X_RANGE = 4; // magnet travels from -4 to +4 coil radii

/**
 * A bar magnet passing through a coil. The flux rises then falls, so the induced EMF
 * (Faraday: EMF = −N dΦ/dt) swings one way then the other (Lenz's law).
 */
export function FaradayInduction({
  turns: initialTurns,
  speed: initialSpeed,
  caption,
}: {
  turns: number;
  speed: number;
  caption: string;
}) {
  const [turns, setTurns] = useState(initialTurns);
  const [speed, setSpeed] = useState(initialSpeed);
  const [x, setX] = useState(-X_RANGE);
  const [playing, setPlaying] = useState(false);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = (t: number) => {
      const dt = last.current === null ? 0 : (t - last.current) / 1000;
      last.current = t;
      setX((prev) => (prev + speed * dt > X_RANGE ? -X_RANGE : prev + speed * dt));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      last.current = null;
    };
  }, [playing, speed]);

  const flux = coilFlux(x);
  const emf = coilEmf(x, speed, turns);
  const maxEmf = 0.86 * turns * 3; // peak |dΦ/dx| ≈ 0.86 at the fastest speed (3)

  // Graph geometry (bottom half): flux and EMF against magnet position.
  const gx = (v: number) => 40 + ((v + X_RANGE) / (2 * X_RANGE)) * (W - 80);
  const gTop = 190;
  const gH = 120;
  const curve = (fn: (v: number) => number) =>
    Array.from({ length: 121 }, (_, i) => {
      const v = -X_RANGE + (i / 120) * 2 * X_RANGE;
      return `${gx(v).toFixed(1)},${(gTop + gH / 2 - fn(v) * (gH / 2 - 6)).toFixed(1)}`;
    }).join(" ");

  return (
    <WidgetShell
      title="Faraday's law of induction"
      caption={caption}
      readouts={
        <>
          <Readout label="Flux (relative)" value={flux.toFixed(2)} />
          <Readout label="Induced EMF" value={`${emf >= 0 ? "+" : ""}${emf.toFixed(1)} (rel.)`} />
          <Readout label="Turns N" value={String(turns)} />
          <Readout label="Magnet speed" value={`${speed.toFixed(1)}×`} />
        </>
      }
      controls={
        <>
          <Slider
            label="Coil turns N"
            value={turns}
            min={10}
            max={500}
            step={10}
            unit=""
            onChange={setTurns}
          />
          <Slider
            label="Magnet speed"
            value={speed}
            min={0.5}
            max={3}
            step={0.5}
            unit="×"
            onChange={setSpeed}
            format={(v) => v.toFixed(1)}
          />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <WidgetButton onClick={() => setPlaying((p) => !p)}>
              {playing ? "Pause" : "▶ Push the magnet through"}
            </WidgetButton>
            <WidgetButton
              onClick={() => {
                setPlaying(false);
                setX(-X_RANGE);
              }}
            >
              Reset
            </WidgetButton>
          </div>
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Magnet at position ${x.toFixed(1)}; flux ${flux.toFixed(2)}; induced EMF ${emf.toFixed(1)} relative units`}
      >
        {/* Coil */}
        {Array.from({ length: 6 }, (_, i) => (
          <ellipse
            key={i}
            cx={W / 2 - 25 + i * 10}
            cy={90}
            rx={8}
            ry={48}
            fill="none"
            stroke="#b45309"
            strokeWidth="3"
          />
        ))}
        {/* Magnet */}
        <g transform={`translate(${W / 2 + (x / X_RANGE) * 270} 90)`}>
          <rect x={-50} y={-16} width={50} height={32} fill="#e1306c" rx="3" />
          <rect x={0} y={-16} width={50} height={32} fill="#3b82f6" rx="3" />
          <text x={-25} y={5} textAnchor="middle" fill="white" fontWeight="700">
            N
          </text>
          <text x={25} y={5} textAnchor="middle" fill="white" fontWeight="700">
            S
          </text>
        </g>
        {/* Meter needle */}
        <g transform={`translate(${W - 70} 70)`}>
          <circle r={34} fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
          <line
            x1={0}
            y1={14}
            x2={Math.sin((emf / maxEmf) * 1.3) * 28}
            y2={14 - Math.cos((emf / maxEmf) * 1.3) * 28}
            stroke="var(--fg)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <text y={30} textAnchor="middle" fontSize="11" fill="var(--muted)">
            EMF
          </text>
        </g>
        {/* Graphs */}
        <line x1={40} y1={gTop + gH / 2} x2={W - 40} y2={gTop + gH / 2} stroke="var(--border)" />
        <polyline points={curve(coilFlux)} fill="none" stroke="#10b981" strokeWidth="2.5" />
        <polyline
          points={curve((v) => coilEmf(v, speed, turns) / maxEmf)}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
        />
        <line
          x1={gx(x)}
          y1={gTop}
          x2={gx(x)}
          y2={gTop + gH}
          stroke="var(--fg)"
          strokeDasharray="3 3"
        />
        <text x={44} y={gTop - 6} fontSize="12" fill="#10b981">
          flux Φ
        </text>
        <text x={100} y={gTop - 6} fontSize="12" fill="var(--primary)">
          induced EMF
        </text>
        <text x={W - 40} y={gTop + gH + 16} textAnchor="end" fontSize="11" fill="var(--muted)">
          magnet position →
        </text>
      </svg>
    </WidgetShell>
  );
}
