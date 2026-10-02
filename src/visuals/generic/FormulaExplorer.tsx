"use client";

import { useMemo, useState } from "react";
import { compileFormula, toMathjsNames } from "@/lib/safeMath";
import { fitRange, fmt } from "@/visuals/mathTools";
import { DataNote, GenericFrame } from "@/visuals/generic/Frame";
import type { FormulaSpec } from "@/visuals/generic/specs";
import { Readout, Slider } from "@/visuals/ui";
import { Curve, Graph, makeGraphScale } from "@/visuals/widgets/math/Graph";

/**
 * The universal interactive (SPEC §4.1 item 4): a formula with a slider per variable, the
 * live result and a graph of the result against one variable. mathjs does the maths.
 */
export default function FormulaExplorer({ spec }: { spec: FormulaSpec }) {
  const names = spec.variables.map((v) => v.name);
  const compute = useMemo(
    () => compileFormula(toMathjsNames(spec.formula), names),
    [spec.formula, names],
  );
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(spec.variables.map((v) => [v.name, v.value])),
  );
  const graphVar = spec.variables.find((v) => v.name === spec.graphVariable) ?? spec.variables[0];
  const result = compute(values);

  const curve = (x: number) => compute({ ...values, [graphVar.name]: x });
  const [yMin, yMax] = fitRange(
    Array.from({ length: 101 }, (_, i) =>
      curve(graphVar.min + ((graphVar.max - graphVar.min) * i) / 100),
    ),
  );
  const scale = makeGraphScale({
    xMin: graphVar.min,
    xMax: graphVar.max,
    yMin: Math.min(0, yMin),
    yMax,
  });
  const here = values[graphVar.name];

  return (
    <GenericFrame
      icon="🎛️"
      title={`Formula explorer: ${spec.output.label}`}
      caption={spec.caption}
      interactive
      note={<DataNote data="computed" />}
      controls={
        <>
          {spec.variables.map((v) => (
            <Slider
              key={v.name}
              label={`${v.label} (${v.name})`}
              value={values[v.name]}
              min={v.min}
              max={v.max}
              step={v.step ?? Number(((v.max - v.min) / 100).toPrecision(2))}
              unit={v.unit}
              format={fmt}
              onChange={(n) => setValues((prev) => ({ ...prev, [v.name]: n }))}
            />
          ))}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
        <code className="rounded bg-surface-2 px-2 py-1 font-mono text-sm">{spec.formula}</code>
        <dl className="grid grid-cols-1">
          <Readout
            label={spec.output.label}
            value={`${Number.isFinite(result) ? fmt(result, 5) : "undefined"} ${spec.output.unit}`}
          />
        </dl>
      </div>
      <Graph scale={scale} label={`${spec.output.label} against ${graphVar.label}`}>
        <Curve scale={scale} f={curve} />
        {Number.isFinite(result) && (
          <circle
            cx={scale.sx(here)}
            cy={scale.sy(result)}
            r={7}
            fill="#f59e0b"
            stroke="var(--surface)"
            strokeWidth={2}
          />
        )}
      </Graph>
      <p className="px-3 pb-2 text-xs text-muted">
        Graph: {spec.output.label} ({spec.output.unit}) against {graphVar.label} ({graphVar.unit});
        the dot is your current value.
      </p>
    </GenericFrame>
  );
}
