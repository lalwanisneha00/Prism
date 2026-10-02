"use client";

import type { ComponentType } from "react";
import type { z } from "zod";
import { KeyIdeaCard } from "@/visuals/KeyIdeaCard";
import { isWidgetId, widgetRegistry, type WidgetId } from "@/visuals/registry";
import { AcWave } from "@/visuals/widgets/AcWave";
import { Capacitor } from "@/visuals/widgets/Capacitor";
import { CoulombForce } from "@/visuals/widgets/CoulombForce";
import { DcCircuit } from "@/visuals/widgets/DcCircuit";
import { FaradayInduction } from "@/visuals/widgets/FaradayInduction";
import { FieldLines } from "@/visuals/widgets/FieldLines";
import { GaussSurface } from "@/visuals/widgets/GaussSurface";
import { FourierSeries } from "@/visuals/widgets/math/FourierSeries";
import { FunctionExplorer } from "@/visuals/widgets/math/FunctionExplorer";
import { MatrixTransform } from "@/visuals/widgets/math/MatrixTransform";
import { RiemannSum } from "@/visuals/widgets/math/RiemannSum";
import { SlopeField } from "@/visuals/widgets/math/SlopeField";
import { TangentLine } from "@/visuals/widgets/math/TangentLine";
import { TaylorPolynomial } from "@/visuals/widgets/math/TaylorPolynomial";
import { VectorField } from "@/visuals/widgets/math/VectorField";
import { WireField } from "@/visuals/widgets/WireField";

type Props<K extends WidgetId> = z.infer<(typeof widgetRegistry)[K]["params"]> & {
  caption: string;
};

/** Each widget's component. The type checks every component accepts its registry params. */
const components: { [K in WidgetId]: ComponentType<Props<K>> } = {
  "field-lines": FieldLines,
  "coulomb-force": CoulombForce,
  "gauss-surface": GaussSurface,
  capacitor: Capacitor,
  "wire-field": WireField,
  "faraday-induction": FaradayInduction,
  "dc-circuit": DcCircuit,
  "ac-wave": AcWave,
  "function-explorer": FunctionExplorer,
  "tangent-line": TangentLine,
  "riemann-sum": RiemannSum,
  "taylor-polynomial": TaylorPolynomial,
  "matrix-transform": MatrixTransform,
  "vector-field": VectorField,
  "slope-field": SlopeField,
  "fourier-series": FourierSeries,
};

/** Draws a registry widget after checking its parameters; anything invalid becomes a key-idea card. */
export function WidgetView({
  widget,
  params,
  caption,
}: {
  widget: string;
  params: unknown;
  caption: string;
}) {
  if (!isWidgetId(widget)) return <KeyIdeaCard caption={caption} />;
  const parsed = widgetRegistry[widget].params.safeParse(params);
  if (!parsed.success) return <KeyIdeaCard caption={caption} />;
  // TypeScript can't link `widget` to its own params here; the table above guarantees it.
  const Component = components[widget] as ComponentType<object & { caption: string }>;
  return <Component {...(parsed.data as object)} caption={caption} />;
}
