"use client";

import { useState } from "react";
import { siFormat, wireField } from "@/visuals/physics";
import { ArrowMarker, Readout, Slider, WidgetButton, WidgetShell } from "@/visuals/ui";

const W = 640;
const H = 360;
const CX = W / 2;
const CY = H / 2;

/**
 * Looking down a long straight wire: circular magnetic field lines (right-hand rule).
 * Current out of the screen → anticlockwise field; into the screen → clockwise.
 */
export function WireField({
  current: initialI,
  direction: initialDir,
  caption,
}: {
  current: number;
  direction: "out" | "in";
  caption: string;
}) {
  const [current, setCurrent] = useState(initialI);
  const [direction, setDirection] = useState(initialDir);
  const [probeCm, setProbeCm] = useState(5);
  const b = wireField(current, probeCm / 100);
  const radii = [40, 75, 115, 160];
  const pxPerCm = 160 / 20;
  // Anticlockwise on screen for current out of the screen.
  const ccw = direction === "out";

  return (
    <WidgetShell
      title="Magnetic field of a straight wire"
      caption={caption}
      readouts={
        <>
          <Readout label="Current I" value={`${current} A`} />
          <Readout label="Distance r" value={`${probeCm} cm`} />
          <Readout label="B = μ₀I / 2πr" value={siFormat(b, "T")} />
          <Readout label="Field direction" value={ccw ? "anticlockwise" : "clockwise"} />
        </>
      }
      controls={
        <>
          <Slider
            label="Current I"
            value={current}
            min={0.5}
            max={50}
            step={0.5}
            unit="A"
            onChange={setCurrent}
          />
          <Slider
            label="Probe distance r"
            value={probeCm}
            min={1}
            max={20}
            step={1}
            unit="cm"
            onChange={setProbeCm}
          />
          <div className="sm:col-span-2">
            <WidgetButton onClick={() => setDirection((d) => (d === "out" ? "in" : "out"))}>
              Reverse the current (
              {direction === "out" ? "now out of the screen" : "now into the screen"})
            </WidgetButton>
          </div>
        </>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Field circles around a wire carrying ${current} amps ${direction === "out" ? "out of" : "into"} the screen; ${siFormat(b, "tesla")} at ${probeCm} cm`}
      >
        <defs>
          <ArrowMarker id="wf-arrow" color="var(--primary)" />
        </defs>
        {radii.map((r, i) => {
          // Spacing grows with distance: the field weakens as 1/r.
          const width = Math.max(0.8, 3 * (current / 50) * (radii[0] / r) + 0.8);
          const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
          return (
            <g key={r}>
              <circle
                cx={CX}
                cy={CY}
                r={r}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={width}
                opacity={0.75 - i * 0.12}
              />
              {angles.map((a) => {
                // Tangent direction for anticlockwise motion on screen (y down): (sin a, -cos a)... flipped for clockwise.
                const px = CX + r * Math.cos(a);
                const py = CY - r * Math.sin(a);
                const tx = -Math.sin(a) * (ccw ? 1 : -1);
                const ty = -Math.cos(a) * (ccw ? 1 : -1);
                return (
                  <line
                    key={a}
                    x1={px - tx * 6}
                    y1={py - ty * 6}
                    x2={px + tx * 6}
                    y2={py + ty * 6}
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                    markerEnd="url(#wf-arrow)"
                  />
                );
              })}
            </g>
          );
        })}
        <circle cx={CX} cy={CY} r={16} fill="var(--surface)" stroke="var(--fg)" strokeWidth="3" />
        {direction === "out" ? (
          <circle cx={CX} cy={CY} r={4} fill="var(--fg)" />
        ) : (
          <g stroke="var(--fg)" strokeWidth="3">
            <line x1={CX - 7} y1={CY - 7} x2={CX + 7} y2={CY + 7} />
            <line x1={CX - 7} y1={CY + 7} x2={CX + 7} y2={CY - 7} />
          </g>
        )}
        <circle
          cx={CX + probeCm * pxPerCm}
          cy={CY}
          r={6}
          fill="#f59e0b"
          stroke="white"
          strokeWidth="2"
        />
        <text
          x={CX + probeCm * pxPerCm}
          y={CY + 22}
          textAnchor="middle"
          fill="var(--fg)"
          fontSize="13"
        >
          probe
        </text>
        <text x={14} y={24} fill="var(--muted)" fontSize="13">
          {direction === "out" ? "• current out of the screen" : "× current into the screen"}
        </text>
      </svg>
    </WidgetShell>
  );
}
