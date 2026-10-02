"use client";

import { useState } from "react";
import {
  evalPolynomial,
  fmt,
  maclaurinCoefficients,
  taylorFunctions,
  type TaylorFn,
} from "@/visuals/mathTools";
import { Readout, Slider, WidgetShell } from "@/visuals/ui";
import { Curve, Graph, Legend, makeGraphScale } from "@/visuals/widgets/math/Graph";

const bounds: Record<TaylorFn, { xMin: number; xMax: number; yMin: number; yMax: number }> = {
  sin: { xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -2, yMax: 2 },
  cos: { xMin: -2 * Math.PI, xMax: 2 * Math.PI, yMin: -2, yMax: 2 },
  exp: { xMin: -4, xMax: 3, yMin: -2, yMax: 12 },
  ln1p: { xMin: -0.95, xMax: 2.5, yMin: -3, yMax: 2 },
  geometric: { xMin: -1.5, xMax: 0.95, yMin: -1, yMax: 8 },
};

/** A function and its Maclaurin polynomial: add terms and watch them hug the curve. */
export function TaylorPolynomial({
  fn,
  order: startOrder,
  caption,
}: {
  fn: TaylorFn;
  order: number;
  caption: string;
}) {
  const [order, setOrder] = useState(startOrder);
  const { label, f, radius } = taylorFunctions[fn];
  const coefficients = maclaurinCoefficients(fn, order);
  const p = (x: number) => evalPolynomial(coefficients, x);
  const scale = makeGraphScale(bounds[fn]);
  const probe = fn === "exp" ? 2 : fn === "ln1p" || fn === "geometric" ? 0.5 : Math.PI / 2;

  return (
    <WidgetShell
      title={`Maclaurin series of ${label}`}
      caption={caption}
      readouts={
        <>
          <Readout label="Degree n" value={String(order)} />
          <Readout label={`f(${fmt(probe)})`} value={fmt(f(probe), 6)} />
          <Readout label={`Pₙ(${fmt(probe)})`} value={fmt(p(probe), 6)} />
          <Readout
            label="Converges for"
            value={radius === Infinity ? "all x" : `|x| < ${radius}`}
          />
        </>
      }
      controls={
        <div className="sm:col-span-2">
          <Slider
            label="Degree of the polynomial n"
            value={order}
            min={0}
            max={15}
            step={1}
            unit=""
            onChange={setOrder}
          />
        </div>
      }
    >
      <Graph scale={scale} label={`${label} and its degree ${order} Maclaurin polynomial`}>
        <Curve scale={scale} f={f} color="var(--muted)" width={4} />
        <Curve scale={scale} f={p} color="var(--primary)" width={2.5} />
      </Graph>
      <Legend
        items={[
          { color: "var(--muted)", label: label },
          { color: "var(--primary)", label: `Maclaurin polynomial Pₙ(x), n = ${order}` },
        ]}
      />
    </WidgetShell>
  );
}
