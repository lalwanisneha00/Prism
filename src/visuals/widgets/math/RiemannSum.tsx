"use client";

import { useMemo, useState } from "react";
import { parseExpression } from "@/visuals/expression";
import { fitRange, fmt, riemannSum, simpson, type RiemannMethod } from "@/visuals/mathTools";
import { Readout, Slider, WidgetButton, WidgetShell } from "@/visuals/ui";
import { Curve, Graph, makeGraphScale } from "@/visuals/widgets/math/Graph";

const methods: RiemannMethod[] = ["left", "midpoint", "right"];

/** Area under a curve as thin rectangles: more rectangles → closer to the exact integral. */
export function RiemannSum({
  expression,
  a,
  b,
  n: startN,
  method: startMethod,
  caption,
}: {
  expression: string;
  a: number;
  b: number;
  n: number;
  method: RiemannMethod;
  caption: string;
}) {
  const [n, setN] = useState(startN);
  const [method, setMethod] = useState(startMethod);
  const f = useMemo(() => parseExpression(expression), [expression]);
  const span = b - a;
  const xMin = a - span * 0.1;
  const xMax = b + span * 0.1;
  const [yMin, yMax] = useMemo(() => {
    const [lo, hi] = fitRange(
      Array.from({ length: 201 }, (_, i) => f(xMin + ((xMax - xMin) * i) / 200)),
    );
    return [Math.min(lo, 0), Math.max(hi, 0)];
  }, [f, xMin, xMax]);
  const scale = makeGraphScale({ xMin, xMax, yMin, yMax });
  const { rects, total } = riemannSum(f, a, b, n, method);
  const exact = useMemo(() => simpson(f, a, b, 2000), [f, a, b]);
  const error = total - exact;

  return (
    <WidgetShell
      title={`Area under y = ${expression}`}
      caption={caption}
      readouts={
        <>
          <Readout label={`${n} rectangles`} value={fmt(total, 5)} />
          <Readout label="Exact ∫" value={fmt(exact, 5)} />
          <Readout label="Error" value={fmt(error, 2)} />
          <Readout label="Width Δx" value={fmt(span / n)} />
        </>
      }
      controls={
        <>
          <Slider
            label="Number of rectangles n"
            value={n}
            min={1}
            max={50}
            step={1}
            unit=""
            onChange={setN}
          />
          <div className="flex flex-col gap-1">
            <span className="text-sm">Height taken at the</span>
            <div className="flex flex-wrap gap-2">
              {methods.map((m) => (
                <WidgetButton key={m} onClick={() => setMethod(m)}>
                  {m === method ? `● ${m}` : m}
                </WidgetButton>
              ))}
            </div>
          </div>
        </>
      }
    >
      <Graph
        scale={scale}
        label={`${n} ${method} rectangles give ${fmt(total, 5)}; the exact area is ${fmt(exact, 5)}`}
      >
        {rects.map((r, i) => {
          const top = scale.sy(Math.max(r.height, 0));
          const bottom = scale.sy(Math.min(r.height, 0));
          return Number.isFinite(r.height) ? (
            <rect
              key={i}
              x={scale.sx(r.x)}
              y={top}
              width={Math.max(0, scale.sx(r.x + r.width) - scale.sx(r.x))}
              height={Math.max(0, bottom - top)}
              fill={r.height >= 0 ? "#10b98155" : "#ef444455"}
              stroke={r.height >= 0 ? "#10b981" : "#ef4444"}
            />
          ) : null;
        })}
        <Curve scale={scale} f={f} />
      </Graph>
    </WidgetShell>
  );
}
