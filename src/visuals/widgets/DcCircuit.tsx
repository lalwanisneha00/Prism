"use client";

import { useEffect, useState } from "react";
import { seriesCircuit, siFormat } from "@/visuals/physics";
import { Readout, Slider, WidgetButton, WidgetShell } from "@/visuals/ui";

const W = 640;
const H = 280;
const L = 80;
const R = 560;
const T = 60;
const B = 220;
const perimeter = 2 * (R - L) + 2 * (B - T);

/** Position along the rectangular loop, clockwise from the battery's + terminal (top-left). */
function pointOnLoop(d: number): { x: number; y: number } {
  let s = ((d % perimeter) + perimeter) % perimeter;
  if (s < R - L) return { x: L + s, y: T };
  s -= R - L;
  if (s < B - T) return { x: R, y: T + s };
  s -= B - T;
  if (s < R - L) return { x: R - s, y: B };
  s -= R - L;
  return { x: L, y: B - s };
}

/** A battery and resistors in series, with conventional current shown as moving dots. */
export function DcCircuit({
  voltage: initialV,
  resistors: initialR,
  caption,
}: {
  voltage: number;
  resistors: number[];
  caption: string;
}) {
  const [volts, setVolts] = useState(initialV);
  const [ohms, setOhms] = useState(initialR);
  const [offset, setOffset] = useState(0);
  const [moving, setMoving] = useState(true);
  const c = seriesCircuit(volts, ohms);
  const amps = c.current;

  useEffect(() => {
    if (!moving) return;
    // Dot speed grows with current (log scale so both mA and A are visible).
    const speed = Math.max(10, Math.min(160, 60 + 40 * Math.log10(amps)));
    const id = setInterval(() => setOffset((o) => (o + speed / 20) % perimeter), 50);
    return () => clearInterval(id);
  }, [moving, amps]);

  const slots = ohms.map((_, i) => L + ((i + 1) / (ohms.length + 1)) * (R - L));

  return (
    <WidgetShell
      title="Series DC circuit"
      caption={caption}
      readouts={
        <>
          <Readout label="Current I = V/R" value={siFormat(c.current, "A")} />
          <Readout label="Total resistance" value={siFormat(c.totalOhms, "Ω")} />
          <Readout label="Power P = VI" value={siFormat(c.power, "W")} />
          <Readout
            label="Drops add up to"
            value={`${c.drops.reduce((s, v) => s + v, 0).toFixed(2)} V`}
          />
        </>
      }
      controls={
        <>
          <Slider
            label="Battery voltage"
            value={volts}
            min={1}
            max={24}
            step={1}
            unit="V"
            onChange={setVolts}
          />
          {ohms.map((r, i) => (
            <Slider
              key={i}
              label={`Resistor R${i + 1}`}
              value={r}
              min={1}
              max={100}
              step={1}
              unit="Ω"
              onChange={(v) => setOhms((rs) => rs.map((x, j) => (j === i ? v : x)))}
            />
          ))}
          <div className="sm:col-span-2">
            <WidgetButton onClick={() => setMoving((m) => !m)}>
              {moving ? "Pause current" : "Show current"}
            </WidgetButton>
          </div>
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`${volts} volt battery with ${ohms.length} resistors in series; current ${siFormat(c.current, "amps")}`}
      >
        <rect
          x={L}
          y={T}
          width={R - L}
          height={B - T}
          fill="none"
          stroke="var(--fg)"
          strokeWidth="3"
        />
        {/* Battery on the left side: long line = + terminal */}
        <rect x={L - 14} y={(T + B) / 2 - 22} width={28} height={44} fill="var(--surface)" />
        <line
          x1={L - 16}
          y1={(T + B) / 2 - 8}
          x2={L + 16}
          y2={(T + B) / 2 - 8}
          stroke="var(--fg)"
          strokeWidth="3"
        />
        <line
          x1={L - 8}
          y1={(T + B) / 2 + 8}
          x2={L + 8}
          y2={(T + B) / 2 + 8}
          stroke="var(--fg)"
          strokeWidth="6"
        />
        <text x={L - 24} y={(T + B) / 2 + 5} textAnchor="end" fill="var(--fg)" fontWeight="700">
          {volts} V
        </text>
        {/* Resistors along the top */}
        {slots.map((x, i) => (
          <g key={i}>
            <rect
              x={x - 28}
              y={T - 12}
              width={56}
              height={24}
              rx="3"
              fill="var(--surface)"
              stroke="#b45309"
              strokeWidth="3"
            />
            <text
              x={x}
              y={T + 5}
              textAnchor="middle"
              fontSize="13"
              fill="var(--fg)"
              fontWeight="600"
            >
              {ohms[i]} Ω
            </text>
            <text x={x} y={T - 20} textAnchor="middle" fontSize="12" fill="var(--muted)">
              {c.drops[i].toFixed(2)} V
            </text>
          </g>
        ))}
        {/* Conventional current: from + terminal, clockwise round the loop */}
        {Array.from({ length: 14 }, (_, i) => {
          const p = pointOnLoop(offset + (i * perimeter) / 14);
          return <circle key={i} cx={p.x} cy={p.y} r={4.5} fill="#f59e0b" />;
        })}
        <text x={W / 2} y={B + 32} textAnchor="middle" fill="var(--muted)" fontSize="13">
          Dots show conventional current (+ to −); their speed grows with the current.
        </text>
      </svg>
    </WidgetShell>
  );
}
