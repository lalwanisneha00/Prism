"use client";

import { useMemo } from "react";
import { parseExpression } from "@/visuals/expression";
import { derivative, fitRange, fmt, simpson } from "@/visuals/mathTools";
import { GenericFrame, palette } from "@/visuals/generic/Frame";
import type { GraphSpec } from "@/visuals/generic/specs";
import { ArrowMarker } from "@/visuals/ui";
import {
  Curve,
  equalAspectBounds,
  Graph,
  Legend,
  makeGraphScale,
} from "@/visuals/widgets/math/Graph";

/** Functions, shaded areas, tangents, points and vectors on one graph (SPEC §4.1 item 3). */
export function FunctionGraph({ spec }: { spec: GraphSpec }) {
  const fns = useMemo(
    () => spec.functions.map((f) => parseExpression(f.expression)),
    [spec.functions],
  );
  const [x0, x1] = spec.xRange;

  const bounds = useMemo(() => {
    if (spec.equalAspect) {
      const half = Math.max(Math.abs(x0), Math.abs(x1)) / 2.1;
      return equalAspectBounds(
        spec.yRange ? Math.max(Math.abs(spec.yRange[0]), Math.abs(spec.yRange[1])) : half,
      );
    }
    const [lo, hi] =
      spec.yRange ??
      fitRange([
        ...fns.flatMap((f) => Array.from({ length: 121 }, (_, i) => f(x0 + ((x1 - x0) * i) / 120))),
        ...(spec.points ?? []).map((p) => p.at[1]),
        ...(spec.vectors ?? []).flatMap((v) => [v.from[1], v.to[1]]),
      ]);
    return { xMin: x0, xMax: x1, yMin: lo, yMax: hi };
  }, [fns, spec.equalAspect, spec.yRange, spec.points, spec.vectors, x0, x1]);
  const scale = makeGraphScale(bounds);

  const shade = spec.shade && fns[spec.shade.index];
  const shadePath = (() => {
    if (!spec.shade || !shade) return null;
    const { from, to } = spec.shade;
    const pts = Array.from({ length: 81 }, (_, i) => {
      const x = from + ((to - from) * i) / 80;
      return `${scale.sx(x)},${scale.sy(shade(x))}`;
    });
    return `M${scale.sx(from)},${scale.sy(0)} L${pts.join(" L")} L${scale.sx(to)},${scale.sy(0)} Z`;
  })();
  const area = spec.shade && shade ? simpson(shade, spec.shade.from, spec.shade.to, 400) : null;

  const tangentFn = spec.tangent && fns[spec.tangent.index];
  const tangent =
    spec.tangent && tangentFn
      ? {
          x: spec.tangent.x,
          y: tangentFn(spec.tangent.x),
          m: derivative(tangentFn, spec.tangent.x),
        }
      : null;

  return (
    <GenericFrame
      icon="📈"
      title="Graph"
      caption={spec.caption}
      note={
        <p className="text-xs text-muted">
          Drawn from the equations in code.
          {area !== null && ` Shaded area ≈ ${fmt(area, 4)}.`}
          {tangent && ` Tangent slope at x = ${fmt(tangent.x)} is ${fmt(tangent.m)}.`}
        </p>
      }
    >
      <Graph scale={scale} label={`Graph of ${spec.functions.map((f) => f.label).join(", ")}`}>
        <defs>
          <ArrowMarker id="fg-arrow" color="#e1306c" size={10} />
        </defs>
        {shadePath && <path d={shadePath} fill="var(--primary)" fillOpacity={0.2} />}
        {fns.map((f, i) => (
          <Curve key={i} scale={scale} f={f} color={palette[i]} />
        ))}
        {tangent && Number.isFinite(tangent.m) && (
          <>
            <Curve
              scale={scale}
              f={(x) => tangent.y + tangent.m * (x - tangent.x)}
              color="#f59e0b"
              width={2}
              dashed
            />
            <circle cx={scale.sx(tangent.x)} cy={scale.sy(tangent.y)} r={6} fill="#f59e0b" />
          </>
        )}
        {spec.vectors?.map((v, i) => (
          <g key={`v${i}`}>
            <line
              x1={scale.sx(v.from[0])}
              y1={scale.sy(v.from[1])}
              x2={scale.sx(v.to[0])}
              y2={scale.sy(v.to[1])}
              stroke="#e1306c"
              strokeWidth={3}
              markerEnd="url(#fg-arrow)"
            />
            <text
              x={scale.sx(v.to[0]) + 6}
              y={scale.sy(v.to[1]) - 6}
              fontSize="13"
              fill="var(--fg)"
            >
              {v.label}
            </text>
          </g>
        ))}
        {spec.points?.map((p, i) => (
          <g key={`p${i}`}>
            <circle cx={scale.sx(p.at[0])} cy={scale.sy(p.at[1])} r={5} fill="var(--fg)" />
            <text
              x={scale.sx(p.at[0]) + 8}
              y={scale.sy(p.at[1]) - 8}
              fontSize="13"
              fill="var(--fg)"
            >
              {p.label}
            </text>
          </g>
        ))}
      </Graph>
      <Legend items={spec.functions.map((f, i) => ({ color: palette[i], label: f.label }))} />
      <p className="px-3 pb-2 text-xs text-muted">
        x: {spec.xLabel} · y: {spec.yLabel}
      </p>
    </GenericFrame>
  );
}
