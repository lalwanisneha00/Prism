"use client";

import { useState } from "react";
import { coulombForce, siFormat } from "@/visuals/physics";
import { ArrowMarker, chargeColor, Readout, Slider, WidgetShell } from "@/visuals/ui";

const W = 640;
const H = 220;

/** Two point charges and the force between them (Coulomb's law). */
export function CoulombForce({
  q1: initialQ1,
  q2: initialQ2,
  distance: initialR,
  caption,
}: {
  q1: number;
  q2: number;
  distance: number;
  caption: string;
}) {
  const [q1, setQ1] = useState(initialQ1);
  const [q2, setQ2] = useState(initialQ2);
  const [r, setR] = useState(initialR);
  const force = coulombForce(q1 * 1e-6, q2 * 1e-6, r);
  const repel = force > 0;
  const zero = q1 === 0 || q2 === 0;

  // Charge positions on screen: separation drawn proportional to r (0.05–1 m).
  const gap = 80 + (r / 1) * 360;
  const x1 = W / 2 - gap / 2;
  const x2 = W / 2 + gap / 2;
  // Arrow length grows with log(force) so both tiny and huge forces stay visible.
  const len = zero ? 0 : Math.min(110, Math.max(18, 20 + 12 * Math.log10(Math.abs(force) / 1e-4)));
  const dir = repel ? 1 : -1;

  return (
    <WidgetShell
      title="Coulomb's law"
      caption={caption}
      readouts={
        <>
          <Readout label="Force on each" value={siFormat(Math.abs(force), "N")} />
          <Readout label="Type" value={zero ? "none" : repel ? "repulsive" : "attractive"} />
          <Readout label="Distance" value={`${r.toFixed(2)} m`} />
          <Readout label="F × r²" value={siFormat(Math.abs(force) * r * r, "N·m²")} />
        </>
      }
      controls={
        <>
          <Slider
            label="Charge q₁"
            value={q1}
            min={-10}
            max={10}
            step={0.5}
            unit="µC"
            onChange={setQ1}
          />
          <Slider
            label="Charge q₂"
            value={q2}
            min={-10}
            max={10}
            step={0.5}
            unit="µC"
            onChange={setQ2}
          />
          <div className="sm:col-span-2">
            <Slider
              label="Distance r"
              value={r}
              min={0.05}
              max={1}
              step={0.01}
              unit="m"
              onChange={setR}
              format={(v) => v.toFixed(2)}
            />
          </div>
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Two charges ${r.toFixed(2)} m apart with a ${repel ? "repulsive" : "attractive"} force of ${siFormat(Math.abs(force), "N")}`}
      >
        <defs>
          <ArrowMarker id="cf-arrow" color="var(--primary)" size={18} />
        </defs>
        <line
          x1={x1}
          y1={H / 2 + 50}
          x2={x2}
          y2={H / 2 + 50}
          stroke="var(--muted)"
          strokeDasharray="4 4"
        />
        <text x={W / 2} y={H / 2 + 70} textAnchor="middle" fill="var(--muted)" fontSize="14">
          r = {r.toFixed(2)} m
        </text>
        {!zero && (
          <>
            <line
              x1={x1 - dir * 24}
              y1={H / 2}
              x2={x1 - dir * (24 + len)}
              y2={H / 2}
              stroke="var(--primary)"
              strokeWidth="4"
              markerEnd="url(#cf-arrow)"
            />
            <line
              x1={x2 + dir * 24}
              y1={H / 2}
              x2={x2 + dir * (24 + len)}
              y2={H / 2}
              stroke="var(--primary)"
              strokeWidth="4"
              markerEnd="url(#cf-arrow)"
            />
          </>
        )}
        {[
          { x: x1, q: q1, name: "q₁" },
          { x: x2, q: q2, name: "q₂" },
        ].map((c) => (
          <g key={c.name}>
            <circle
              cx={c.x}
              cy={H / 2}
              r={20}
              fill={c.q === 0 ? "var(--muted)" : chargeColor(c.q)}
            />
            <text
              x={c.x}
              y={H / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontWeight="700"
            >
              {c.q > 0 ? "+" : c.q < 0 ? "−" : "0"}
            </text>
            <text x={c.x} y={H / 2 - 34} textAnchor="middle" fill="var(--fg)" fontSize="14">
              {c.name} = {c.q} µC
            </text>
          </g>
        ))}
      </svg>
    </WidgetShell>
  );
}
