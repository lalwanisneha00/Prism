"use client";

import { useMemo, useState } from "react";
import {
  enclosedCharge,
  fieldLines,
  gaussFlux,
  siFormat,
  type PointCharge,
} from "@/visuals/physics";
import { chargeColor, makeScale, Readout, Slider, WidgetShell } from "@/visuals/ui";

const W = 640;
const H = 400;
const bounds = { xMin: -4, xMax: 4, yMin: -2.5, yMax: 2.5 };

/**
 * A Gaussian surface (shown as a circle: a slice through a sphere) around some charges.
 * Grow or shrink it: the flux depends only on the charge inside.
 */
export function GaussSurface({
  charges,
  radius: initialRadius,
  caption,
}: {
  charges: PointCharge[];
  radius: number;
  caption: string;
}) {
  const [radius, setRadius] = useState(initialRadius);
  const { sx, sy } = makeScale(bounds, W, H);
  const lines = useMemo(() => fieldLines(charges, bounds, 6), [charges]);
  const qEnc = enclosedCharge(charges, 0, 0, radius); // in µC
  const flux = gaussFlux(qEnc * 1e-6);
  const pxPerUnit = W / (bounds.xMax - bounds.xMin);

  return (
    <WidgetShell
      title="Gauss's law"
      caption={caption}
      readouts={
        <>
          <Readout label="Charge inside" value={`${qEnc} µC`} />
          <Readout label="Net flux Φ" value={siFormat(flux, "N·m²/C")} />
          <Readout label="Surface radius" value={`${radius.toFixed(1)} m`} />
          <Readout
            label="Charges inside"
            value={`${charges.filter((c) => Math.hypot(c.x, c.y) < radius).length} of ${charges.length}`}
          />
        </>
      }
      controls={
        <div className="sm:col-span-2">
          <Slider
            label="Size of the closed surface"
            value={radius}
            min={0.3}
            max={3.8}
            step={0.1}
            unit="m"
            onChange={setRadius}
            format={(v) => v.toFixed(1)}
          />
        </div>
      }
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`A closed surface of radius ${radius.toFixed(1)} m enclosing ${qEnc} microcoulombs; net flux ${siFormat(flux, "N·m²/C")}`}
      >
        {lines.map((line, i) => (
          <polyline
            key={i}
            points={line.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ")}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="1.2"
            opacity="0.5"
          />
        ))}
        <circle
          cx={sx(0)}
          cy={sy(0)}
          r={radius * pxPerUnit}
          fill="var(--primary)"
          fillOpacity="0.08"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeDasharray="8 6"
        />
        {charges.map((c, i) => {
          const isInside = Math.hypot(c.x, c.y) < radius;
          return (
            <g key={i} transform={`translate(${sx(c.x)} ${sy(c.y)})`} opacity={isInside ? 1 : 0.55}>
              <circle
                r={9 + 3 * Math.abs(c.q)}
                fill={chargeColor(c.q)}
                stroke={isInside ? "var(--primary)" : "white"}
                strokeWidth="3"
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize="13"
                fontWeight="700"
              >
                {c.q > 0 ? `+${c.q}` : c.q}
              </text>
            </g>
          );
        })}
      </svg>
    </WidgetShell>
  );
}
