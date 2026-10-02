"use client";

import { useMemo, useState } from "react";
import { parseFormula } from "@/visuals/expression";
import { fitRange, fmt } from "@/visuals/mathTools";
import { Readout, Slider, WidgetShell } from "@/visuals/ui";
import { Curve, Graph, makeGraphScale } from "@/visuals/widgets/math/Graph";

/** y = f(x, a) with a slider for the parameter a: see how one constant reshapes a curve. */
export function FunctionExplorer({
  expression,
  aMin,
  aMax,
  aStart,
  xRange,
  caption,
}: {
  expression: string;
  aMin: number;
  aMax: number;
  aStart: number;
  xRange: [number, number];
  caption: string;
}) {
  const [a, setA] = useState(aStart);
  const formula = useMemo(() => parseFormula(expression, ["x", "a"]), [expression]);
  const f = (x: number) => formula({ x, a });

  // The y-range covers every slider position, so the axes stay still while you drag.
  const [yMin, yMax] = useMemo(() => {
    const values: number[] = [];
    for (let j = 0; j <= 6; j++) {
      const av = aMin + ((aMax - aMin) * j) / 6;
      for (let i = 0; i <= 80; i++) {
        values.push(formula({ x: xRange[0] + ((xRange[1] - xRange[0]) * i) / 80, a: av }));
      }
    }
    return fitRange(values);
  }, [formula, aMin, aMax, xRange]);
  const scale = makeGraphScale({ xMin: xRange[0], xMax: xRange[1], yMin, yMax });
  const step = Number(((aMax - aMin) / 100).toPrecision(2));

  return (
    <WidgetShell
      title={`Explore y = ${expression}`}
      caption={caption}
      readouts={
        <>
          <Readout label="a" value={fmt(a)} />
          <Readout label={`f(${fmt(xRange[0])})`} value={fmt(f(xRange[0]))} />
          <Readout label={`f(${fmt(xRange[1])})`} value={fmt(f(xRange[1]))} />
        </>
      }
      controls={
        <div className="sm:col-span-2">
          <Slider
            label="Parameter a"
            value={a}
            min={aMin}
            max={aMax}
            step={step}
            unit=""
            onChange={setA}
            format={fmt}
          />
        </div>
      }
    >
      <Graph scale={scale} label={`Graph of y = ${expression} with a = ${fmt(a)}`}>
        <Curve scale={scale} f={f} />
      </Graph>
    </WidgetShell>
  );
}
