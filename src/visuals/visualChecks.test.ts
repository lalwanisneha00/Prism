import { describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import { subjects } from "@/lib/subjects";
import { widgetRegistry, widgetsForTopic } from "@/visuals/registry";
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
  const topics = subjects.flatMap((s) => topicsOf(s.id));

  it("only lists real topics", () => {
    for (const w of Object.values(widgetRegistry)) {
      for (const t of w.topics) expect(topics).toContain(t);
    }
  });

  it("has at least one fitting widget for most topics of every subject", () => {
    for (const subject of subjects) {
      const own = topicsOf(subject.id);
      const covered = own.filter((t) => widgetsForTopic(t).length > 0);
      expect(covered.length / own.length, subject.id).toBeGreaterThan(0.75);
    }
  });

  it("puts fitting widgets first in the prompt and lists only real PhET sims", () => {
    const rules = visualPromptRules("gauss-law");
    expect(rules.indexOf('"gauss-surface" (fits this topic)')).toBeLessThan(
      rules.indexOf('"capacitor"'),
    );
    expect(rules).toContain('"charges-and-fields"');
    expect(rules).not.toContain('"capacitor-lab-basics"');
  });
});
