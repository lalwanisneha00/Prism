"use client";

import { useMemo, useState } from "react";
import { parseExpression } from "@/visuals/expression";
import { derivative, fitRange, fmt } from "@/visuals/mathTools";
import { Readout, Slider, WidgetShell } from "@/visuals/ui";
import { Curve, Graph, Legend, makeGraphScale } from "@/visuals/widgets/math/Graph";

/** Slide a point along y = f(x) and watch the tangent: its slope is the derivative. */
export function TangentLine({
  expression,
  xRange,
  x0: start,
  caption,
}: {
  expression: string;
  xRange: [number, number];
  x0: number;
  caption: string;
}) {
  const [x0, setX0] = useState(start);
  const f = useMemo(() => parseExpression(expression), [expression]);
  const [yMin, yMax] = useMemo(
    () =>
      fitRange(
        Array.from({ length: 241 }, (_, i) => f(xRange[0] + ((xRange[1] - xRange[0]) * i) / 240)),
      ),
    [f, xRange],
  );
  const scale = makeGraphScale({ xMin: xRange[0], xMax: xRange[1], yMin, yMax });
  const y0 = f(x0);
  const slope = derivative(f, x0);
  const flat = Math.abs(slope) < 1e-3;

  return (
    <WidgetShell
      title={`Tangent to y = ${expression}`}
      caption={caption}
      readouts={
        <>
          <Readout label="x₀" value={fmt(x0)} />
          <Readout label="f(x₀)" value={fmt(y0)} />
          <Readout label="slope f′(x₀)" value={fmt(slope)} />
          <Readout
            label="Tangent is"
            value={flat ? "flat (stationary)" : slope > 0 ? "rising" : "falling"}
          />
        </>
      }
      controls={
        <div className="sm:col-span-2">
          <Slider
            label="Point x₀"
            value={x0}
            min={xRange[0]}
            max={xRange[1]}
            step={Number(((xRange[1] - xRange[0]) / 200).toPrecision(2))}
            unit=""
            onChange={setX0}
            format={fmt}
          />
        </div>
      }
    >
      <Graph scale={scale} label={`Tangent at x = ${fmt(x0)} with slope ${fmt(slope)}`}>
        <Curve scale={scale} f={f} />
        {Number.isFinite(y0) && Number.isFinite(slope) && (
          <>
            <Curve
              scale={scale}
              f={(x) => y0 + slope * (x - x0)}
              color="#f59e0b"
              width={2.5}
              dashed
            />
            <circle
              cx={scale.sx(x0)}
              cy={scale.sy(y0)}
              r={7}
              fill="#f59e0b"
              stroke="var(--surface)"
              strokeWidth={2}
            />
          </>
        )}
      </Graph>
      <Legend
        items={[
          { color: "var(--primary)", label: "y = f(x)" },
          { color: "#f59e0b", label: "tangent line", dashed: true },
        ]}
      />
    </WidgetShell>
  );
}
