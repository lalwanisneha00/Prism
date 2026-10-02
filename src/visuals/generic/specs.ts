import { z } from "zod";

/*
 * Generic visuals (SPEC §4.1): data-driven components that work in any subject. The AI only
 * fills in a small spec; these schemas and the sanity checks below decide whether it is
 * drawn at all. A broken or misleading chart is never shown.
 */

const text = z.string().trim().min(1);
const short = z.string().trim().min(1).max(60);
const caption = text;

/** Where a visual's numbers come from (SPEC §4.1). Sourced data must cite a lesson source. */
const dataOrigin = {
  data: z.enum(["computed", "sourced", "illustrative"]),
  sourceId: z.string().optional(),
};

export const chartKinds = [
  "line",
  "area",
  "bar",
  "stacked-bar",
  "pie",
  "donut",
  "scatter",
  "histogram",
  "box",
  "radar",
] as const;
export type ChartKind = (typeof chartKinds)[number];

export const ChartSpecSchema = z.object({
  type: z.literal("chart"),
  chart: z.enum(chartKinds),
  title: short.optional(),
  /** Axis titles with units, e.g. "Time (s)"; required for every chart with axes. */
  xLabel: short.optional(),
  yLabel: short.optional(),
  /** Category labels: x positions (line/area/bar/radar) or slice names (pie/donut). */
  categories: z.array(short).max(40).optional(),
  series: z
    .array(z.object({ name: short, values: z.array(z.number()).min(1).max(40) }))
    .max(6)
    .optional(),
  scatter: z
    .array(
      z.object({
        name: short,
        points: z
          .array(z.object({ x: z.number(), y: z.number() }))
          .min(1)
          .max(200),
      }),
    )
    .max(4)
    .optional(),
  bins: z
    .array(z.object({ from: z.number(), to: z.number(), count: z.number().min(0) }))
    .min(2)
    .max(30)
    .optional(),
  boxes: z
    .array(
      z.object({
        name: short,
        min: z.number(),
        q1: z.number(),
        median: z.number(),
        q3: z.number(),
        max: z.number(),
      }),
    )
    .min(1)
    .max(6)
    .optional(),
  /** "%" makes a pie chart's slices add up to 100. */
  unit: z.string().max(12).optional(),
  ...dataOrigin,
  caption,
});
export type ChartSpec = z.infer<typeof ChartSpecSchema>;

const point = z.tuple([z.number(), z.number()]);

export const GraphSpecSchema = z.object({
  type: z.literal("graph"),
  functions: z.array(z.object({ expression: z.string().min(1).max(120), label: short })).max(4),
  xRange: z.tuple([z.number(), z.number()]),
  yRange: z.tuple([z.number(), z.number()]).optional(),
  xLabel: short,
  yLabel: short,
  /** Shade the area under functions[index] from `from` to `to`. */
  shade: z.object({ index: z.int().min(0), from: z.number(), to: z.number() }).optional(),
  /** Draw the tangent to functions[index] at x. */
  tangent: z.object({ index: z.int().min(0), x: z.number() }).optional(),
  points: z
    .array(z.object({ at: point, label: short }))
    .max(8)
    .optional(),
  vectors: z
    .array(z.object({ from: point, to: point, label: short }))
    .max(6)
    .optional(),
  /** Same scale on both axes (true angles), for vectors and geometry. */
  equalAspect: z.boolean().optional(),
  caption,
});
export type GraphSpec = z.infer<typeof GraphSpecSchema>;

const identifier = z
  .string()
  .regex(/^[a-zA-Z][a-zA-Z0-9_]{0,11}$/, "variable names: a letter, then letters, digits or _");

export const FormulaSpecSchema = z.object({
  type: z.literal("formula"),
  /** A mathjs formula in the variables below, e.g. "P * (1 + r/100)^t". */
  formula: z.string().min(1).max(200),
  output: z.object({ label: short, unit: z.string().max(20) }),
  variables: z
    .array(
      z.object({
        name: identifier,
        label: short,
        unit: z.string().max(20),
        min: z.number(),
        max: z.number(),
        value: z.number(),
        step: z.number().positive().optional(),
      }),
    )
    .min(1)
    .max(5),
  /** The variable on the graph's x-axis (default: the first one). */
  graphVariable: identifier.optional(),
  caption,
});
export type FormulaSpec = z.infer<typeof FormulaSpecSchema>;

export const CompareSpecSchema = z.object({
  type: z.literal("compare"),
  style: z.enum(["table", "venn", "pros-cons", "before-after"]),
  title: short.optional(),
  /** table: column headings (the first column holds the row labels). */
  columns: z.array(z.string().trim().max(60)).min(2).max(5).optional(),
  rows: z
    .array(z.object({ label: short, cells: z.array(z.string().max(160)).min(1).max(4) }))
    .max(12)
    .optional(),
  /** venn: two or three sets; "shared" lists what all of them have in common. */
  sets: z
    .array(z.object({ label: short, items: z.array(z.string().max(80)).max(8) }))
    .min(2)
    .max(3)
    .optional(),
  shared: z.array(z.string().max(80)).max(8).optional(),
  /** pros-cons and before-after: the two lists. */
  left: z.array(z.string().max(160)).max(8).optional(),
  right: z.array(z.string().max(160)).max(8).optional(),
  leftLabel: short.optional(),
  rightLabel: short.optional(),
  caption,
});
export type CompareSpec = z.infer<typeof CompareSpecSchema>;

export const StepsSpecSchema = z.object({
  type: z.literal("steps"),
  steps: z
    .array(
      z.object({
        title: short,
        /** Markdown with KaTeX. */
        body: text,
        /** Optional display formula, LaTeX without $ signs. */
        formula: z.string().max(300).optional(),
      }),
    )
    .min(2)
    .max(10),
  caption,
});
export type StepsSpec = z.infer<typeof StepsSpecSchema>;

export const StatsSpecSchema = z.object({
  type: z.literal("stats"),
  tool: z.enum(["normal", "sampling", "regression"]),
  /** normal: the starting curve and an optional shaded interval. */
  mean: z.number().optional(),
  sd: z.number().positive().optional(),
  shadeFrom: z.number().optional(),
  shadeTo: z.number().optional(),
  /** sampling: the population the samples come from and the sample size. */
  population: z.enum(["uniform", "skewed", "normal"]).optional(),
  sampleSize: z.int().min(1).max(100).optional(),
  /** regression: starting points (the student can drag them). */
  points: z
    .array(z.object({ x: z.number(), y: z.number() }))
    .min(3)
    .max(30)
    .optional(),
  xLabel: short.optional(),
  yLabel: short.optional(),
  ...dataOrigin,
  caption,
});
export type StatsSpec = z.infer<typeof StatsSpecSchema>;

export const mermaidKinds = [
  "flowchart",
  "graph",
  "mindmap",
  "sequenceDiagram",
  "stateDiagram-v2",
  "stateDiagram",
  "classDiagram",
  "erDiagram",
  "gantt",
] as const;
