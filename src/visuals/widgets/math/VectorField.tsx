"use client";

import { useMemo, useState } from "react";
import { parseFormula } from "@/visuals/expression";
import { divCurl, fmt } from "@/visuals/mathTools";
import { ArrowMarker, Readout, WidgetShell } from "@/visuals/ui";
import { equalAspectBounds, Graph, makeGraphScale } from "@/visuals/widgets/math/Graph";

/** A plane vector field F = (P, Q) as arrows; tap a point to read its divergence and curl. */
export function VectorField({
  p,
  q,
  range,
  caption,
}: {
  p: string;
  q: string;
  range: number;
  caption: string;
}) {
  const [probe, setProbe] = useState<[number, number]>([range / 2, range / 3]);
  const P = useMemo(() => parseFormula(p, ["x", "y"]), [p]);
  const Q = useMemo(() => parseFormula(q, ["x", "y"]), [q]);
  const fx = (x: number, y: number) => P({ x, y });
  const fy = (x: number, y: number) => Q({ x, y });
  const bounds = equalAspectBounds(range);
  const scale = makeGraphScale(bounds);

  const arrows = useMemo(() => {
    const list: { x: number; y: number; u: number; v: number; mag: number }[] = [];
    const step = range / 4;
    const xMax = equalAspectBounds(range).xMax;
    for (let x = -Math.floor(xMax / step) * step; x <= xMax; x += step) {
      for (let y = -range + step / 2; y <= range; y += step) {
        const u = P({ x, y });
        const v = Q({ x, y });
        if (Number.isFinite(u) && Number.isFinite(v))
          list.push({ x, y, u, v, mag: Math.hypot(u, v) });
      }
    }
    return list;
  }, [P, Q, range]);
  const maxMag = Math.max(1e-9, ...arrows.map((a) => a.mag));
  const len = (range / 4) * 0.8;
  const { divergence, curl } = divCurl(fx, fy, probe[0], probe[1]);

  return (
    <WidgetShell
      title={`Vector field F = (${p}, ${q})`}
      caption={caption}
      readouts={
        <>
          <Readout label="Point" value={`(${fmt(probe[0], 2)}, ${fmt(probe[1], 2)})`} />
          <Readout label="F there" value={`(${fmt(fx(...probe))}, ${fmt(fy(...probe))})`} />
          <Readout
            label="div F"
            value={`${fmt(divergence)} ${divergence > 1e-6 ? "(source)" : divergence < -1e-6 ? "(sink)" : ""}`}
          />
          <Readout
            label="curl F (k̂)"
            value={`${fmt(curl)} ${curl > 1e-6 ? "↺" : curl < -1e-6 ? "↻" : ""}`}
          />
        </>
      }
    >
      <Graph
        scale={scale}
        label={`Arrows of the field F = (${p}, ${q}). Tap to probe a point.`}
        onPoint={(x, y) => setProbe([x, y])}
      >
        <defs>
          <ArrowMarker id="vf-arrow" color="var(--primary)" size={8} />
        </defs>
        {arrows.map((a, i) => {
          const s = (len * (0.35 + 0.65 * (a.mag / maxMag))) / Math.max(a.mag, 1e-9);
          return (
            <line
              key={i}
              x1={scale.sx(a.x)}
              y1={scale.sy(a.y)}
              x2={scale.sx(a.x + a.u * s)}
              y2={scale.sy(a.y + a.v * s)}
              stroke="var(--primary)"
              strokeOpacity={0.35 + 0.65 * (a.mag / maxMag)}
              strokeWidth={2}
              markerEnd="url(#vf-arrow)"
            />
          );
        })}
        <circle
          cx={scale.sx(probe[0])}
          cy={scale.sy(probe[1])}
          r={7}
          fill="#f59e0b"
          stroke="var(--surface)"
          strokeWidth={2}
        />
      </Graph>
      <p className="px-3 pb-2 text-xs text-muted">
        Tap anywhere on the field to move the orange probe.
      </p>
    </WidgetShell>
  );
}
