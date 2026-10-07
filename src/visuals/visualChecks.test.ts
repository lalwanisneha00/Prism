import { describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import { subjects } from "@/lib/subjects";
import { widgetsForTopic } from "@/visuals/registry";
import {
  dropBadVisuals,
  findVisualProblems,
  visualProblem,
  visualPromptRules,
} from "@/visuals/visualChecks";

const caption = "c";

describe("visualProblem", () => {
  it("accepts every visual in the hand-written sample", () => {
    expect(findVisualProblems(sampleLessons[0])).toEqual([]);
  });

  it("rejects unknown widgets and out-of-range params", () => {
    expect(visualProblem({ type: "widget", widget: "laser-show", params: {}, caption })).toMatch(
      /unknown widget/,
    );
    expect(
      visualProblem({
        type: "widget",
        widget: "coulomb-force",
        params: { q1: 99, q2: 1, distance: 0.5 },
        caption,
      }),
    ).toMatch(/q1/);
    expect(
      visualProblem({
        type: "widget",
        widget: "field-lines",
        params: { charges: [{ q: 0, x: 0, y: 0 }] },
        caption,
      }),
    ).toMatch(/charge cannot be 0/);
  });

  it("accepts the example params written in each widget's help text", () => {
    expect(
      visualProblem({
        type: "widget",
        widget: "field-lines",
        params: {
          charges: [
            { q: 1, x: -1.5, y: 0 },
            { q: -1, x: 1.5, y: 0 },
          ],
        },
        caption,
      }),
    ).toBeNull();
  });

  it("checks PhET ids, plot expressions and mermaid code", () => {
    expect(visualProblem({ type: "phet", sim: "made-up-sim", caption })).toMatch(/unknown PhET/);
    expect(visualProblem({ type: "phet", sim: "faradays-law", caption })).toBeNull();
    const plot = { type: "plot" as const, xLabel: "x", yLabel: "y", caption };
    expect(visualProblem({ ...plot, expression: "alert(1)", xRange: [0, 1] })).toMatch(/not valid/);
    expect(visualProblem({ ...plot, expression: "1/x^2", xRange: [3, 1] })).toMatch(/min < max/);
    expect(visualProblem({ type: "mermaid", code: "pie title x", caption })).toMatch(/must start/);
    expect(
      visualProblem({
        type: "mermaid",
        code: "flowchart TD\n A-->B\n click A call evil()",
        caption,
      }),
    ).toMatch(/click/);
  });

  it("drops only the visuals that cannot be shown", () => {
    const lesson = structuredClone(sampleLessons[0]);
    lesson.sections[0].visual = { type: "phet", sim: "nope", caption };
    const cleaned = dropBadVisuals(lesson);
    expect(cleaned.sections[0].visual).toBeUndefined();
    expect(cleaned.sections[1].visual).toEqual(lesson.sections[1].visual);
  });
});

describe("registry coverage", () => {
  const topicsOf = (subjectId: string) =>
    subjects.find((s) => s.id === subjectId)!.chapters.flatMap((c) => c.topics.map((t) => t.id));

  it("is still reachable from the PDEU catalogue (topics that match an older widget topic)", () => {
    const reached = subjects.filter((s) => s.offerings).flatMap((s) => topicsOf(s.id));
    expect(reached.filter((t) => widgetsForTopic(t).length > 0).length).toBeGreaterThan(150);
  });

  it("offers only the widgets and PhET sims built for the topic", () => {
    const rules = visualPromptRules("gauss-law");
    expect(rules).toContain('"gauss-surface"');
    expect(rules).not.toContain('"capacitor"');
    expect(rules).toContain('"charges-and-fields"');
    expect(rules).not.toContain('"capacitor-lab-basics"');
    // A topic with no widget still gets the generic visuals.
    const plain = visualPromptRules("no-such-topic");
    expect(plain).not.toContain('"type":"widget"');
    expect(plain).toContain('"type":"plot"');
  });

  it("rejects a topic-specific widget used on another topic (enforced in code)", () => {
    const visual = {
      type: "widget" as const,
      widget: "capacitor",
      params: { areaCm2: 100, gapMm: 1, kappa: 1, voltage: 12 },
      caption: "A capacitor.",
    };
    expect(visualProblem(visual, "capacitors")).toBeNull();
    expect(visualProblem(visual, "gauss-law")).toMatch(/not valid for this topic/);
    expect(visualProblem({ type: "phet", sim: "coulombs-law", caption: "x" }, "phasors")).toMatch(
      /not valid for this topic/,
    );
  });
});
