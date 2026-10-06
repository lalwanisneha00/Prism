"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { z } from "zod";
import { KeyIdeaCard } from "@/visuals/KeyIdeaCard";
import { isWidgetId, widgetRegistry, type WidgetId } from "@/visuals/registry";

type Props<K extends WidgetId> = z.infer<(typeof widgetRegistry)[K]["params"]> & {
  caption: string;
};

/** A widget's code is fetched only when a lesson actually uses it, with a placeholder meanwhile. */
function lazy<K extends WidgetId>(
  load: () => Promise<ComponentType<Props<K>>>,
): ComponentType<Props<K>> {
  return dynamic(load, {
    ssr: false,
    loading: () => (
      <div className="h-72 animate-pulse rounded-xl bg-surface-2" aria-busy="true" role="status" />
    ),
  }) as ComponentType<Props<K>>;
}

/** Each widget's component. The type checks every component accepts its registry params. */
const components: { [K in WidgetId]: ComponentType<Props<K>> } = {
  "field-lines": lazy(() => import("@/visuals/widgets/FieldLines").then((m) => m.FieldLines)),
  "coulomb-force": lazy(() => import("@/visuals/widgets/CoulombForce").then((m) => m.CoulombForce)),
  "gauss-surface": lazy(() => import("@/visuals/widgets/GaussSurface").then((m) => m.GaussSurface)),
  capacitor: lazy(() => import("@/visuals/widgets/Capacitor").then((m) => m.Capacitor)),
  "wire-field": lazy(() => import("@/visuals/widgets/WireField").then((m) => m.WireField)),
  "faraday-induction": lazy(() =>
    import("@/visuals/widgets/FaradayInduction").then((m) => m.FaradayInduction),
  ),
  "dc-circuit": lazy(() => import("@/visuals/widgets/DcCircuit").then((m) => m.DcCircuit)),
  "ac-wave": lazy(() => import("@/visuals/widgets/AcWave").then((m) => m.AcWave)),
  "function-explorer": lazy(() =>
    import("@/visuals/widgets/math/FunctionExplorer").then((m) => m.FunctionExplorer),
  ),
  "tangent-line": lazy(() =>
    import("@/visuals/widgets/math/TangentLine").then((m) => m.TangentLine),
  ),
  "riemann-sum": lazy(() => import("@/visuals/widgets/math/RiemannSum").then((m) => m.RiemannSum)),
  "taylor-polynomial": lazy(() =>
    import("@/visuals/widgets/math/TaylorPolynomial").then((m) => m.TaylorPolynomial),
  ),
  "matrix-transform": lazy(() =>
    import("@/visuals/widgets/math/MatrixTransform").then((m) => m.MatrixTransform),
  ),
  "vector-field": lazy(() =>
    import("@/visuals/widgets/math/VectorField").then((m) => m.VectorField),
  ),
  "slope-field": lazy(() => import("@/visuals/widgets/math/SlopeField").then((m) => m.SlopeField)),
  "fourier-series": lazy(() =>
    import("@/visuals/widgets/math/FourierSeries").then((m) => m.FourierSeries),
  ),
  oscillator: lazy(() => import("@/visuals/wave1/PhysicsWidgets").then((m) => m.Oscillator)),
  "standing-wave": lazy(() => import("@/visuals/wave1/PhysicsWidgets").then((m) => m.StandingWave)),
  "slit-pattern": lazy(() => import("@/visuals/wave1/PhysicsWidgets").then((m) => m.SlitPattern)),
  "quantum-box": lazy(() => import("@/visuals/wave1/PhysicsWidgets").then((m) => m.QuantumBox)),
  "beer-lambert": lazy(() => import("@/visuals/wave1/ChemistryWidgets").then((m) => m.BeerLambert)),
  "phase-diagram": lazy(() =>
    import("@/visuals/wave1/ChemistryWidgets").then((m) => m.PhaseDiagram),
  ),
  "nernst-cell": lazy(() => import("@/visuals/wave1/ChemistryWidgets").then((m) => m.NernstCell)),
  "three-phase": lazy(() => import("@/visuals/wave1/ElectricalWidgets").then((m) => m.ThreePhase)),
  "first-order-transient": lazy(() =>
    import("@/visuals/wave1/ElectricalWidgets").then((m) => m.FirstOrderTransient),
  ),
  transformer: lazy(() =>
    import("@/visuals/wave1/ElectricalWidgets").then((m) => m.TransformerWidget),
  ),
  "torque-slip": lazy(() => import("@/visuals/wave1/ElectricalWidgets").then((m) => m.TorqueSlip)),
  "diode-rectifier": lazy(() =>
    import("@/visuals/wave1/ElectronicsWidgets").then((m) => m.DiodeRectifier),
  ),
  "load-line": lazy(() => import("@/visuals/wave1/ElectronicsWidgets").then((m) => m.LoadLine)),
  "op-amp": lazy(() => import("@/visuals/wave1/ElectronicsWidgets").then((m) => m.OpAmp)),
  "logic-gates": lazy(() => import("@/visuals/wave1/ElectronicsWidgets").then((m) => m.LogicGates)),
  "force-resultant": lazy(() =>
    import("@/visuals/wave1/MechanicsGraphicsWidgets").then((m) => m.ForceResultant),
  ),
  "incline-friction": lazy(() =>
    import("@/visuals/wave1/MechanicsGraphicsWidgets").then((m) => m.InclineFriction),
  ),
  projectile: lazy(() =>
    import("@/visuals/wave1/MechanicsGraphicsWidgets").then((m) => m.ProjectileWidget),
  ),
  "conic-eccentricity": lazy(() =>
    import("@/visuals/wave1/MechanicsGraphicsWidgets").then((m) => m.ConicEccentricity),
  ),
  "roulette-curves": lazy(() =>
    import("@/visuals/wave1/MechanicsGraphicsWidgets").then((m) => m.RouletteCurves),
  ),
  "orthographic-views": lazy(() =>
    import("@/visuals/wave1/MechanicsGraphicsWidgets").then((m) => m.OrthographicViews),
  ),
  "sort-stepper": lazy(() =>
    import("@/visuals/wave1/ComputingEcologyComplexWidgets").then((m) => m.SortStepper),
  ),
  "binary-search": lazy(() =>
    import("@/visuals/wave1/ComputingEcologyComplexWidgets").then((m) => m.BinarySearch),
  ),
  "recursion-tree": lazy(() =>
    import("@/visuals/wave1/ComputingEcologyComplexWidgets").then((m) => m.RecursionTree),
  ),
  "energy-pyramid": lazy(() =>
    import("@/visuals/wave1/ComputingEcologyComplexWidgets").then((m) => m.EnergyPyramid),
  ),
  "population-growth": lazy(() =>
    import("@/visuals/wave1/ComputingEcologyComplexWidgets").then((m) => m.PopulationGrowth),
  ),
  "rainwater-harvesting": lazy(() =>
    import("@/visuals/wave1/ComputingEcologyComplexWidgets").then((m) => m.RainwaterHarvesting),
  ),
  "complex-mapping": lazy(() =>
    import("@/visuals/wave1/ComputingEcologyComplexWidgets").then((m) => m.ComplexMapping),
  ),
  "residue-contour": lazy(() =>
    import("@/visuals/wave1/ComputingEcologyComplexWidgets").then((m) => m.ResidueContour),
  ),
  "stack-queue": lazy(() => import("@/visuals/wave2/DsaWidgets").then((m) => m.StackQueue)),
  postfix: lazy(() => import("@/visuals/wave2/DsaWidgets").then((m) => m.Postfix)),
  "linked-list": lazy(() => import("@/visuals/wave2/DsaWidgets").then((m) => m.LinkedListWidget)),
  bst: lazy(() => import("@/visuals/wave2/DsaWidgets").then((m) => m.BstWidget)),
  heap: lazy(() => import("@/visuals/wave2/DsaWidgets").then((m) => m.HeapWidget)),
  "hash-table": lazy(() => import("@/visuals/wave2/DsaWidgets").then((m) => m.HashTable)),
  "graph-algorithms": lazy(() =>
    import("@/visuals/wave2/DsaWidgets").then((m) => m.GraphAlgorithms),
  ),
  "knapsack-dp": lazy(() => import("@/visuals/wave2/DsaWidgets").then((m) => m.KnapsackDp)),
  "truth-table": lazy(() => import("@/visuals/wave2/DsaWidgets").then((m) => m.TruthTableWidget)),
  "venn-count": lazy(() => import("@/visuals/wave2/DsaWidgets").then((m) => m.VennCount)),
  combinatorics: lazy(() => import("@/visuals/wave2/DsaWidgets").then((m) => m.Combinatorics)),
  "number-format": lazy(() => import("@/visuals/wave2/SystemsWidgets").then((m) => m.NumberFormat)),
  booth: lazy(() => import("@/visuals/wave2/SystemsWidgets").then((m) => m.BoothWidget)),
  "cache-sim": lazy(() => import("@/visuals/wave2/SystemsWidgets").then((m) => m.CacheSim)),
  pipeline: lazy(() => import("@/visuals/wave2/SystemsWidgets").then((m) => m.PipelineWidget)),
  "cpu-scheduler": lazy(() => import("@/visuals/wave2/SystemsWidgets").then((m) => m.CpuScheduler)),
  "page-replacement": lazy(() =>
    import("@/visuals/wave2/SystemsWidgets").then((m) => m.PageReplacement),
  ),
  bankers: lazy(() => import("@/visuals/wave2/SystemsWidgets").then((m) => m.Bankers)),
  "disk-scheduler": lazy(() =>
    import("@/visuals/wave2/SystemsWidgets").then((m) => m.DiskScheduler),
  ),
  subnet: lazy(() => import("@/visuals/wave2/SystemsWidgets").then((m) => m.SubnetCalc)),
  crc: lazy(() => import("@/visuals/wave2/SystemsWidgets").then((m) => m.CrcWidget)),
  "tcp-congestion": lazy(() =>
    import("@/visuals/wave2/SystemsWidgets").then((m) => m.TcpCongestion),
  ),
  "arq-window": lazy(() => import("@/visuals/wave2/SystemsWidgets").then((m) => m.ArqWindow)),
  "sql-join": lazy(() => import("@/visuals/wave2/SystemsWidgets").then((m) => m.SqlJoin)),
  "fd-closure": lazy(() => import("@/visuals/wave2/SystemsWidgets").then((m) => m.FdClosure)),
  "precedence-graph": lazy(() =>
    import("@/visuals/wave2/SystemsWidgets").then((m) => m.PrecedenceGraph),
  ),
  "dfa-sim": lazy(() => import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.DfaSim)),
  "turing-increment": lazy(() =>
    import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.TuringIncrement),
  ),
  "pda-brackets": lazy(() => import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.PdaBrackets)),
  lexer: lazy(() => import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.LexerWidget)),
  "three-address": lazy(() =>
    import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.ThreeAddress),
  ),
  "dispatch-explorer": lazy(() =>
    import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.DispatchExplorer),
  ),
  "object-references": lazy(() =>
    import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.ObjectReferences),
  ),
  cocomo: lazy(() => import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.CocomoWidget)),
  cyclomatic: lazy(() => import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.CyclomaticWidget)),
  "function-points": lazy(() =>
    import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.FunctionPoints),
  ),
  "http-explorer": lazy(() =>
    import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.HttpExplorer),
  ),
  "dom-tree": lazy(() => import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.DomTree)),
  "box-model": lazy(() => import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.BoxModel)),
  "gradient-descent": lazy(() =>
    import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.GradientDescentWidget),
  ),
  "k-means": lazy(() => import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.KMeansWidget)),
  "grid-search": lazy(() => import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.GridSearch)),
  entropy: lazy(() => import("@/visuals/wave2/TheoryAiWidgets").then((m) => m.EntropyWidget)),
  kmap: lazy(() => import("@/visuals/wave2/EceSignalWidgets").then((m) => m.KarnaughMap)),
  "flip-flop": lazy(() => import("@/visuals/wave2/EceSignalWidgets").then((m) => m.FlipFlopWidget)),
  counter: lazy(() => import("@/visuals/wave2/EceSignalWidgets").then((m) => m.CounterWidget)),
  convolution: lazy(() =>
    import("@/visuals/wave2/EceSignalWidgets").then((m) => m.ConvolutionWidget),
  ),
  sampling: lazy(() => import("@/visuals/wave2/EceSignalWidgets").then((m) => m.SamplingWidget)),
  "pole-zero": lazy(() => import("@/visuals/wave2/EceSignalWidgets").then((m) => m.PoleZero)),
  modulation: lazy(() =>
    import("@/visuals/wave2/EceSignalWidgets").then((m) => m.ModulationWidget),
  ),
  pcm: lazy(() => import("@/visuals/wave2/EceSignalWidgets").then((m) => m.PcmWidget)),
  constellation: lazy(() =>
    import("@/visuals/wave2/EceSignalWidgets").then((m) => m.ConstellationWidget),
  ),
  "dft-spectrum": lazy(() => import("@/visuals/wave2/EceSignalWidgets").then((m) => m.DftSpectrum)),
  "fir-design": lazy(() => import("@/visuals/wave2/EceSignalWidgets").then((m) => m.FirDesign)),
  "iir-response": lazy(() => import("@/visuals/wave2/EceSignalWidgets").then((m) => m.IirResponse)),
  "rlc-resonance": lazy(() =>
    import("@/visuals/wave2/EceCircuitWidgets").then((m) => m.RlcResonance),
  ),
  "max-power": lazy(() =>
    import("@/visuals/wave2/EceCircuitWidgets").then((m) => m.MaxPowerTransfer),
  ),
  "amp-bode": lazy(() => import("@/visuals/wave2/EceCircuitWidgets").then((m) => m.AmplifierBode)),
  "diff-amp": lazy(() => import("@/visuals/wave2/EceCircuitWidgets").then((m) => m.DiffAmp)),
  "adc-dac": lazy(() => import("@/visuals/wave2/EceCircuitWidgets").then((m) => m.AdcDac)),
  "segment-address": lazy(() =>
    import("@/visuals/wave2/EceCircuitWidgets").then((m) => m.SegmentAddress),
  ),
  "address-decoder": lazy(() =>
    import("@/visuals/wave2/EceCircuitWidgets").then((m) => m.AddressDecoder),
  ),
  "accumulator-machine": lazy(() =>
    import("@/visuals/wave2/EceCircuitWidgets").then((m) => m.AccumulatorMachine),
  ),
  "transmission-line": lazy(() =>
    import("@/visuals/wave2/EceCircuitWidgets").then((m) => m.TransmissionLine),
  ),
  polarisation: lazy(() =>
    import("@/visuals/wave2/EceCircuitWidgets").then((m) => m.PolarisationWidget),
  ),
  waveguide: lazy(() => import("@/visuals/wave2/EceCircuitWidgets").then((m) => m.WaveguideCutoff)),
  "skin-depth": lazy(() => import("@/visuals/wave2/EceCircuitWidgets").then((m) => m.SkinDepth)),
  "mosfet-iv": lazy(() => import("@/visuals/wave2/EceCircuitWidgets").then((m) => m.MosfetIv)),
  "cmos-inverter": lazy(() =>
    import("@/visuals/wave2/EceCircuitWidgets").then((m) => m.CmosInverter),
  ),
  "cmos-power": lazy(() => import("@/visuals/wave2/EceCircuitWidgets").then((m) => m.CmosPower)),
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
