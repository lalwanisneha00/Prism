import { describe, expect, it } from "vitest";
import { compileFormula, formulaProblem, toMathjsNames } from "@/lib/safeMath";
import {
  chartProblem,
  compareProblem,
  formulaSpecProblem,
  graphProblem,
  statsProblem,
  stepsProblem,
} from "@/visuals/generic/checks";
import { ChartSpecSchema, type ChartSpec } from "@/visuals/generic/specs";
import {
  histogram,
  linearRegression,
  meanAndSd,
  normalCdf,
  sampleMeans,
  seededRandom,
} from "@/visuals/generic/statsMath";

const base = {
  type: "chart" as const,
  data: "illustrative" as const,
  caption: "Notice the trend.",
};
const chart = (spec: Partial<ChartSpec>): ChartSpec => ChartSpecSchema.parse({ ...base, ...spec });

describe("chart sanity checks", () => {
  it("accepts a well-formed line chart and rejects mismatched series", () => {
    const line = {
      chart: "line" as const,
      xLabel: "Year",
      yLabel: "Sales (units)",
      categories: ["2023", "2024"],
    };
    expect(chartProblem(chart({ ...line, series: [{ name: "A", values: [1, 2] }] }))).toBeNull();
    expect(chartProblem(chart({ ...line, series: [{ name: "A", values: [1] }] }))).toMatch(
      /1 values for 2/,
    );
    expect(
      chartProblem(
        chart({ chart: "line", categories: ["a"], series: [{ name: "A", values: [1] }] }),
      ),
    ).toMatch(/xLabel and yLabel/);
  });

  it("checks pie slices add up to 100%", () => {
    const pie = { chart: "pie" as const, unit: "%", categories: ["Rent", "Food", "Other"] };
    expect(
      chartProblem(chart({ ...pie, series: [{ name: "Budget", values: [50, 30, 20] }] })),
    ).toBeNull();
    expect(
      chartProblem(chart({ ...pie, series: [{ name: "Budget", values: [50, 30, 30] }] })),
    ).toMatch(/110%, not 100%/);
  });

  it("checks box plots and histograms are in order", () => {
    expect(
      chartProblem(
        chart({
          chart: "box",
          xLabel: "Group",
          yLabel: "Score",
          boxes: [{ name: "A", min: 1, q1: 4, median: 3, q3: 6, max: 9 }],
        }),
      ),
    ).toMatch(/min ≤ Q1 ≤ median/);
    expect(
      chartProblem(
        chart({
          chart: "histogram",
          xLabel: "Height (cm)",
          yLabel: "Count",
          bins: [
            { from: 150, to: 160, count: 3 },
            { from: 165, to: 170, count: 5 },
          ],
        }),
      ),
    ).toMatch(/touch each other/);
  });

  it("requires sourced data to cite a real lesson source", () => {
    const spec = chart({
      chart: "bar",
      xLabel: "Country",
      yLabel: "GDP (USD bn)",
      categories: ["A"],
      series: [{ name: "GDP", values: [1] }],
      data: "sourced",
    });
    expect(chartProblem(spec)).toMatch(/needs a "sourceId"/);
    expect(chartProblem({ ...spec, sourceId: "wikipedia-gdp" }, { sourceIds: ["other"] })).toMatch(
      /not one of the lesson's sources/,
    );
    expect(
      chartProblem({ ...spec, sourceId: "wikipedia-gdp" }, { sourceIds: ["wikipedia-gdp"] }),
    ).toBeNull();
  });
});

describe("other generic visuals", () => {
  it("formula explorer: only safe calculations in the given variables", () => {
    expect(formulaProblem("P * (1 + r/100)^t", ["P", "r", "t"])).toBeNull();
    expect(formulaProblem("P * q", ["P"])).toMatch(/"q" is not one of the variables/);
    expect(formulaProblem("f(x) = x", ["x"])).toMatch(/may only calculate/);
    expect(formulaProblem('evaluate("1")', [])).toMatch(/not allowed/);
    expect(formulaProblem("import({})", [])).toMatch(/not allowed|may only calculate/);
    const emi = compileFormula("P*r*(1+r)^n/((1+r)^n-1)", ["P", "r", "n"]);
    expect(emi({ P: 100000, r: 0.01, n: 12 })).toBeCloseTo(8884.88, 1);
    expect(
      formulaSpecProblem({
        type: "formula",
        formula: "m * a",
        output: { label: "Force", unit: "N" },
        variables: [{ name: "m", label: "Mass", unit: "kg", min: 0, max: 10, value: 20 }],
        caption: "x",
      }),
    ).toMatch(/between min and max/);
  });

  it("formula explorer: our names (ln, log) mean the same in mathjs", () => {
    expect(toMathjsNames("ln(x) + log(100)")).toBe("log(x) + log10(100)");
    expect(compileFormula(toMathjsNames("ln(e) + log(100)"), [])({})).toBeCloseTo(3, 9);
    expect(
      formulaSpecProblem({
        type: "formula",
        formula: "P * (1 + r/100)^t",
        output: { label: "Amount", unit: "₹" },
        variables: [
          { name: "P", label: "Principal", unit: "₹", min: 1000, max: 100000, value: 10000 },
          { name: "r", label: "Rate", unit: "%", min: 1, max: 15, value: 8 },
          { name: "t", label: "Years", unit: "y", min: 0, max: 30, value: 10 },
        ],
        caption: "x",
      }),
    ).toBeNull();
  });

  it("graph, compare and steps checks", () => {
    const graph = {
      type: "graph" as const,
      functions: [{ expression: "x^2", label: "y = x²" }],
      xRange: [0, 2] as [number, number],
      xLabel: "x",
      yLabel: "y",
      caption: "c",
    };
    expect(graphProblem(graph)).toBeNull();
    expect(graphProblem({ ...graph, tangent: { index: 3, x: 1 } })).toMatch(/index/);
    expect(
      compareProblem({
        type: "compare",
        style: "table",
        columns: ["", "Series", "Parallel"],
        rows: [{ label: "Current", cells: ["same"] }],
        caption: "c",
      }),
    ).toMatch(/needs 2 cells/);
    expect(
      stepsProblem({
        type: "steps",
        steps: [
          { title: "A", body: "ok" },
          { title: "B", body: "x", formula: String.raw`\frac{1}{` },
        ],
        caption: "c",
      }),
    ).toMatch(/step 2 formula/);
    expect(
      statsProblem({ type: "stats", tool: "regression", data: "illustrative", caption: "c" }),
    ).toMatch(/starting points/);
  });
});

describe("statistics maths", () => {
  it("normal distribution probabilities", () => {
    expect(normalCdf(0, 0, 1)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96, 0, 1) - normalCdf(-1.96, 0, 1)).toBeCloseTo(0.95, 3);
  });

  it("least-squares regression", () => {
    const fit = linearRegression([
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ]);
    expect(fit.slope).toBeCloseTo(2, 9);
    expect(fit.intercept).toBeCloseTo(1, 9);
    expect(fit.r).toBeCloseTo(1, 9);
  });

  it("sample means cluster around the population mean (central limit theorem)", () => {
    const means = sampleMeans("uniform", 30, 400, seededRandom(42));
    const { mean, sd } = meanAndSd(means);
    expect(mean).toBeCloseTo(5, 0);
    // σ/√n = (10/√12)/√30 ≈ 0.527
    expect(sd).toBeGreaterThan(0.4);
    expect(sd).toBeLessThan(0.65);
    expect(histogram([0, 5, 9.9, 10], 0, 10, 2)).toEqual([1, 3]);
  });
});
