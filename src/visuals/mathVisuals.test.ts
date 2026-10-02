import { describe, expect, it } from "vitest";
import { sourcesForTopic, topicsWithSources } from "@/lib/sources";
import { SourceSchema, VisualSpecSchema } from "@/lib/schema";
import { subjects } from "@/lib/subjects";
import { widgetProblem } from "@/visuals/registry";
import { visualProblem, visualPromptRules } from "@/visuals/visualChecks";

describe("maths widgets", () => {
  it("accept good parameters", () => {
    expect(
      widgetProblem("function-explorer", {
        expression: "exp(-a*x)*sin(3*x)",
        aMin: 0,
        aMax: 2,
        aStart: 0.5,
        xRange: [0, 10],
      }),
    ).toBeNull();
    expect(widgetProblem("vector-field", { p: "-y", q: "x", range: 3 })).toBeNull();
    // A matrix written as rows is accepted too.
    expect(
      widgetProblem("matrix-transform", {
        matrix: [
          [2, 1],
          [1, 2],
        ],
      }),
    ).toBeNull();
    expect(
      widgetProblem("matrix-transform", {
        matrix: [
          [9, 1],
          [1, 2],
        ],
      }),
    ).toMatch(/a/);
    expect(
      widgetProblem("slope-field", { f: "x - y", xRange: [-3, 3], yRange: [-3, 3], start: [0, 1] }),
    ).toBeNull();
  });

  it("reject expressions the parser can't read, unsafe names and bad ranges", () => {
    expect(widgetProblem("tangent-line", { expression: "x^", xRange: [0, 1], x0: 0.5 })).toMatch(
      /valid expression/,
    );
    expect(widgetProblem("vector-field", { p: "constructor", q: "x", range: 2 })).toMatch(
      /valid expression/,
    );
    expect(widgetProblem("vector-field", { p: "xy", q: "x", range: 2 })).toMatch(/use \*/);
    expect(
      widgetProblem("riemann-sum", { expression: "x", a: 2, b: 1, n: 4, method: "left" }),
    ).toMatch(/a < b/);
    expect(widgetProblem("tangent-line", { expression: "x", xRange: [0, 1], x0: 5 })).toMatch(
      /inside xRange/,
    );
    expect(widgetProblem("taylor-polynomial", { fn: "tan", order: 3 })).not.toBeNull();
  });
});

describe("derivation visuals", () => {
  const caption = "A derivation.";
  it("accept steps whose maths renders", () => {
    const visual = VisualSpecSchema.parse({
      type: "derivation",
      steps: [
        { math: String.raw`\int_0^1 x\,dx`, why: "Start from the area under $y = x$." },
        { math: String.raw`= \tfrac{1}{2}`, why: "Evaluate the antiderivative." },
      ],
      caption,
    });
    expect(visualProblem(visual)).toBeNull();
  });

  it("reject broken LaTeX and single-step derivations", () => {
    const broken = VisualSpecSchema.parse({
      type: "derivation",
      steps: [
        { math: String.raw`\frac{1}{`, why: "Oops." },
        { math: "x", why: "Fine." },
      ],
      caption,
    });
    expect(visualProblem(broken)).toMatch(/step 1 maths does not render/);
    expect(
      VisualSpecSchema.safeParse({ type: "derivation", steps: [{ math: "x", why: "y" }], caption })
        .success,
    ).toBe(false);
  });

  it("are offered in the prompt", () => {
    expect(visualPromptRules("taylor-maclaurin")).toContain('"type":"derivation"');
    expect(visualPromptRules("taylor-maclaurin")).toContain(
      '"taylor-polynomial" (fits this topic)',
    );
  });
});

describe("Engineering Mathematics data", () => {
  const math = subjects.find((s) => s.id === "engg-math")!;
  const topics = math.chapters.flatMap((c) => c.topics.map((t) => t.id));

  it("has sources for every topic, from the right OpenStax book", () => {
    expect(topicsWithSources("engg-math").sort()).toEqual([...topics].sort());
    for (const t of topics) {
      const sources = sourcesForTopic("engg-math", t);
      expect(sources.length, t).toBeGreaterThan(0);
      for (const s of sources) expect(SourceSchema.safeParse(s).success).toBe(true);
      expect(new Set(sources.map((s) => s.id)).size).toBe(sources.length);
    }
    const [greens] = sourcesForTopic("engg-math", "greens-theorem");
    expect(greens).toMatchObject({
      id: "openstax-calc3-6-4-greens-theorem",
      title: "Calculus Volume 3, §6.4 Green's Theorem",
      url: "https://openstax.org/books/calculus-volume-3/pages/6-4-greens-theorem",
    });
  });

  it("uses unique ids across all subjects", () => {
    const all = subjects.flatMap((s) => s.chapters.flatMap((c) => c.topics.map((t) => t.id)));
    expect(new Set(all).size).toBe(all.length);
  });
});
