import { katexError, mathErrorsInMarkdown } from "@/lib/checks/mathCheck";
import { isValidExpression } from "@/visuals/expression";
import type {
  ChartSpec,
  CompareSpec,
  FormulaSpec,
  GraphSpec,
  StatsSpec,
  StepsSpec,
} from "@/visuals/generic/specs";

/*
 * Sanity checks for generic visuals (SPEC §4.1): things a schema can't express, like "pie
 * slices add up to 100%" or "a box plot's quartiles are in order". A visual that fails is
 * sent back to the AI once, then dropped; it is never drawn broken.
 */

type Context = { sourceIds?: string[] };

function originProblem(spec: { data: string; sourceId?: string }, ctx: Context): string | null {
  if (spec.data !== "sourced") return null;
  if (!spec.sourceId) return 'data "sourced" needs a "sourceId" from SOURCES';
  if (ctx.sourceIds && !ctx.sourceIds.includes(spec.sourceId))
    return `sourceId "${spec.sourceId}" is not one of the lesson's sources`;
  return null;
}

export function chartProblem(c: ChartSpec, ctx: Context = {}): string | null {
  const origin = originProblem(c, ctx);
  if (origin) return origin;
  const axes = !["pie", "donut", "radar"].includes(c.chart);
  if (axes && (!c.xLabel || !c.yLabel))
    return "charts with axes need xLabel and yLabel (with units)";

  switch (c.chart) {
    case "line":
    case "area":
    case "bar":
    case "stacked-bar":
    case "radar": {
      if (!c.categories?.length || !c.series?.length)
        return `a ${c.chart} chart needs categories and series`;
      const bad = c.series.find((s) => s.values.length !== c.categories!.length);
      if (bad)
        return `series "${bad.name}" has ${bad.values.length} values for ${c.categories.length} categories`;
      if (c.chart === "radar" && c.categories.length < 3)
        return "a radar chart needs at least 3 categories";
      if (c.chart === "stacked-bar" && c.series.some((s) => s.values.some((v) => v < 0)))
        return "stacked bars cannot have negative values";
      return null;
    }
    case "pie":
    case "donut": {
      const values = c.series?.[0]?.values;
      if (!c.categories?.length || !values) return "a pie chart needs categories and one series";
      if (values.length !== c.categories.length) return "each pie slice needs exactly one value";
      if (values.length > 8)
        return "a pie chart is unreadable with more than 8 slices; use a bar chart";
      if (values.some((v) => v < 0)) return "pie slices cannot be negative";
      const total = values.reduce((s, v) => s + v, 0);
      if (total <= 0) return "pie slices must add up to more than 0";
      if (c.unit === "%" && Math.abs(total - 100) > 1)
        return `pie slices add up to ${total}%, not 100%`;
      return null;
    }
    case "scatter":
      return c.scatter?.length ? null : "a scatter chart needs scatter points";
    case "histogram": {
      const bins = c.bins;
      if (!bins) return "a histogram needs bins";
      for (let i = 0; i < bins.length; i++) {
        if (!(bins[i].from < bins[i].to)) return `bin ${i + 1} must have from < to`;
        if (i > 0 && Math.abs(bins[i].from - bins[i - 1].to) > 1e-9)
          return "histogram bins must be in order and touch each other";
      }
      return null;
    }
    case "box": {
      if (!c.boxes) return "a box plot needs boxes";
      const bad = c.boxes.find(
        (b) => !(b.min <= b.q1 && b.q1 <= b.median && b.median <= b.q3 && b.q3 <= b.max),
      );
      return bad ? `box "${bad.name}" must have min ≤ Q1 ≤ median ≤ Q3 ≤ max` : null;
    }
  }
}

export function graphProblem(g: GraphSpec): string | null {
  if (!(g.xRange[0] < g.xRange[1])) return "xRange must be [min, max] with min < max";
  if (g.yRange && !(g.yRange[0] < g.yRange[1])) return "yRange must be [min, max] with min < max";
  if (!g.functions.length && !g.points?.length && !g.vectors?.length)
    return "a graph needs at least one function, point or vector";
  const bad = g.functions.find((f) => !isValidExpression(f.expression));
  if (bad) return `graph expression "${bad.expression}" is not valid (functions of x only)`;
  for (const ref of [g.shade, g.tangent]) {
    if (ref && !g.functions[ref.index]) return "shade/tangent index must point at a function";
  }
  if (g.shade && !(g.shade.from < g.shade.to)) return "shade needs from < to";
  return null;
}

export function formulaSpecProblem(f: FormulaSpec): string | null {
  const names = f.variables.map((v) => v.name);
  if (new Set(names).size !== names.length) return "variable names must be different";
  for (const v of f.variables) {
    if (!(v.min < v.max)) return `variable "${v.name}" needs min < max`;
    if (v.value < v.min || v.value > v.max)
      return `variable "${v.name}" value must be between min and max`;
  }
  if (f.graphVariable && !names.includes(f.graphVariable))
    return "graphVariable must be one of the variables";
  // Checked with our small safe parser so this file (used in the browser too) doesn't pull in
  // mathjs; the explorer itself computes with mathjs, loaded only when it is on the page.
  const lower = names.map((n) => n.toLowerCase());
  if (new Set(lower).size !== lower.length) return "variable names must differ (ignoring case)";
  return isValidExpression(f.formula, lower)
    ? null
    : `formula "${f.formula}" is not a valid calculation in ${names.join(", ")} (use + - * / ^, brackets and sqrt, exp, ln, log, sin, cos, tan, abs, pi)`;
}

export function compareProblem(c: CompareSpec): string | null {
  switch (c.style) {
    case "table": {
      if (!c.columns || !c.rows?.length) return "a comparison table needs columns and rows";
      const bad = c.rows.find((r) => r.cells.length !== c.columns!.length - 1);
      return bad
        ? `row "${bad.label}" needs ${c.columns.length - 1} cells (one per column after the first)`
        : null;
    }
    case "venn":
      return c.sets ? null : "a Venn diagram needs 2 or 3 sets";
    case "pros-cons":
    case "before-after":
      return c.left?.length && c.right?.length
        ? null
        : `${c.style} needs both lists (left and right)`;
  }
}

export function stepsProblem(s: StepsSpec): string | null {
  for (const [i, step] of s.steps.entries()) {
    const body = mathErrorsInMarkdown(step.body)[0];
    if (body) return `step ${i + 1}: ${body}`;
    if (step.formula) {
      const error = katexError(step.formula, true);
      if (error) return `step ${i + 1} formula does not render (${error})`;
    }
  }
  return null;
}

export function statsProblem(s: StatsSpec, ctx: Context = {}): string | null {
  const origin = originProblem(s, ctx);
  if (origin) return origin;
  if (s.tool === "regression" && !s.points) return "a regression explorer needs starting points";
  if (s.tool === "regression" && (!s.xLabel || !s.yLabel))
    return "a regression explorer needs xLabel and yLabel";
  if (
    s.tool === "normal" &&
    s.shadeFrom !== undefined &&
    s.shadeTo !== undefined &&
    !(s.shadeFrom < s.shadeTo)
  )
    return "shadeFrom must be less than shadeTo";
  return null;
}
