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
import { BeerLambert, NernstCell, PhaseDiagram } from "@/visuals/wave1/ChemistryWidgets";
import {
  BinarySearch,
  ComplexMapping,
  EnergyPyramid,
  PopulationGrowth,
  RainwaterHarvesting,
  RecursionTree,
  ResidueContour,
  SortStepper,
} from "@/visuals/wave1/ComputingEcologyComplexWidgets";
import {
  FirstOrderTransient,
  ThreePhase,
  TorqueSlip,
  TransformerWidget,
} from "@/visuals/wave1/ElectricalWidgets";
import { DiodeRectifier, LoadLine, LogicGates, OpAmp } from "@/visuals/wave1/ElectronicsWidgets";
import {
  ConicEccentricity,
  ForceResultant,
  InclineFriction,
  OrthographicViews,
  ProjectileWidget,
  RouletteCurves,
} from "@/visuals/wave1/MechanicsGraphicsWidgets";
import { Oscillator, QuantumBox, SlitPattern, StandingWave } from "@/visuals/wave1/PhysicsWidgets";

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
  oscillator: Oscillator,
  "standing-wave": StandingWave,
  "slit-pattern": SlitPattern,
  "quantum-box": QuantumBox,
  "beer-lambert": BeerLambert,
  "phase-diagram": PhaseDiagram,
  "nernst-cell": NernstCell,
  "three-phase": ThreePhase,
  "first-order-transient": FirstOrderTransient,
  transformer: TransformerWidget,
  "torque-slip": TorqueSlip,
  "diode-rectifier": DiodeRectifier,
  "load-line": LoadLine,
  "op-amp": OpAmp,
  "logic-gates": LogicGates,
  "force-resultant": ForceResultant,
  "incline-friction": InclineFriction,
  projectile: ProjectileWidget,
  "conic-eccentricity": ConicEccentricity,
  "roulette-curves": RouletteCurves,
  "orthographic-views": OrthographicViews,
  "sort-stepper": SortStepper,
  "binary-search": BinarySearch,
  "recursion-tree": RecursionTree,
  "energy-pyramid": EnergyPyramid,
  "population-growth": PopulationGrowth,
  "rainwater-harvesting": RainwaterHarvesting,
  "complex-mapping": ComplexMapping,
  "residue-contour": ResidueContour,
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
