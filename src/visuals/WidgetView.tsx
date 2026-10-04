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
import {
  BstWidget,
  Combinatorics,
  GraphAlgorithms,
  HashTable,
  HeapWidget,
  KnapsackDp,
  LinkedListWidget,
  Postfix,
  StackQueue,
  TruthTableWidget,
  VennCount,
} from "@/visuals/wave2/DsaWidgets";
import {
  ArqWindow,
  Bankers,
  BoothWidget,
  CacheSim,
  CpuScheduler,
  CrcWidget,
  DiskScheduler,
  FdClosure,
  NumberFormat,
  PageReplacement,
  PipelineWidget,
  PrecedenceGraph,
  SqlJoin,
  SubnetCalc,
  TcpCongestion,
} from "@/visuals/wave2/SystemsWidgets";
import {
  BoxModel,
  CocomoWidget,
  CyclomaticWidget,
  DfaSim,
  DispatchExplorer,
  DomTree,
  EntropyWidget,
  FunctionPoints,
  GradientDescentWidget,
  GridSearch,
  HttpExplorer,
  KMeansWidget,
  LexerWidget,
  ObjectReferences,
  PdaBrackets,
  ThreeAddress,
  TuringIncrement,
} from "@/visuals/wave2/TheoryAiWidgets";
import {
  ConstellationWidget,
  ConvolutionWidget,
  CounterWidget,
  DftSpectrum,
  FirDesign,
  FlipFlopWidget,
  IirResponse,
  KarnaughMap,
  ModulationWidget,
  PcmWidget,
  PoleZero,
  SamplingWidget,
} from "@/visuals/wave2/EceSignalWidgets";
import {
  AccumulatorMachine,
  AdcDac,
  AddressDecoder,
  AmplifierBode,
  CmosInverter,
  CmosPower,
  DiffAmp,
  MaxPowerTransfer,
  MosfetIv,
  PolarisationWidget,
  RlcResonance,
  SegmentAddress,
  SkinDepth,
  TransmissionLine,
  WaveguideCutoff,
} from "@/visuals/wave2/EceCircuitWidgets";

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
  "stack-queue": StackQueue,
  postfix: Postfix,
  "linked-list": LinkedListWidget,
  bst: BstWidget,
  heap: HeapWidget,
  "hash-table": HashTable,
  "graph-algorithms": GraphAlgorithms,
  "knapsack-dp": KnapsackDp,
  "truth-table": TruthTableWidget,
  "venn-count": VennCount,
  combinatorics: Combinatorics,
  "number-format": NumberFormat,
  booth: BoothWidget,
  "cache-sim": CacheSim,
  pipeline: PipelineWidget,
  "cpu-scheduler": CpuScheduler,
  "page-replacement": PageReplacement,
  bankers: Bankers,
  "disk-scheduler": DiskScheduler,
  subnet: SubnetCalc,
  crc: CrcWidget,
  "tcp-congestion": TcpCongestion,
  "arq-window": ArqWindow,
  "sql-join": SqlJoin,
  "fd-closure": FdClosure,
  "precedence-graph": PrecedenceGraph,
  "dfa-sim": DfaSim,
  "turing-increment": TuringIncrement,
  "pda-brackets": PdaBrackets,
  lexer: LexerWidget,
  "three-address": ThreeAddress,
  "dispatch-explorer": DispatchExplorer,
  "object-references": ObjectReferences,
  cocomo: CocomoWidget,
  cyclomatic: CyclomaticWidget,
  "function-points": FunctionPoints,
  "http-explorer": HttpExplorer,
  "dom-tree": DomTree,
  "box-model": BoxModel,
  "gradient-descent": GradientDescentWidget,
  "k-means": KMeansWidget,
  "grid-search": GridSearch,
  entropy: EntropyWidget,
  kmap: KarnaughMap,
  "flip-flop": FlipFlopWidget,
  counter: CounterWidget,
  convolution: ConvolutionWidget,
  sampling: SamplingWidget,
  "pole-zero": PoleZero,
  modulation: ModulationWidget,
  pcm: PcmWidget,
  constellation: ConstellationWidget,
  "dft-spectrum": DftSpectrum,
  "fir-design": FirDesign,
  "iir-response": IirResponse,
  "rlc-resonance": RlcResonance,
  "max-power": MaxPowerTransfer,
  "amp-bode": AmplifierBode,
  "diff-amp": DiffAmp,
  "adc-dac": AdcDac,
  "segment-address": SegmentAddress,
  "address-decoder": AddressDecoder,
  "accumulator-machine": AccumulatorMachine,
  "transmission-line": TransmissionLine,
  polarisation: PolarisationWidget,
  waveguide: WaveguideCutoff,
  "skin-depth": SkinDepth,
  "mosfet-iv": MosfetIv,
  "cmos-inverter": CmosInverter,
  "cmos-power": CmosPower,
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
