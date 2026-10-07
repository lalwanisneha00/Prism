import { describe, expect, it } from "vitest";
import { layoutGraph, NODE_H, NODE_W } from "@/lib/graph/layout";
import {
  allPrerequisites,
  depths,
  graphOf,
  graphProblems,
  studyOrder,
  unlocks,
  withoutShortcuts,
} from "@/lib/graph/prereqGraph";
import { findSubject, allSubjects as subjects, SubjectSchema, type Subject } from "@/lib/subjects";

const em = findSubject("em")!;
const g = graphOf(em);

function subjectWith(topics: { id: string; requires?: string[] }[], chapters = 1): Subject {
  const per = Math.ceil(topics.length / chapters);
  return SubjectSchema.parse({
    id: "t",
    name: "T",
    field: "Test",
    tier: "sourced",
    branches: ["all"],
    semesters: [1],
    syllabusSource: { kind: "none", title: "none" },
    chapters: Array.from({ length: chapters }, (_, i) => ({
      id: `c${i}`,
      name: `C${i}`,
      topics: topics.slice(i * per, (i + 1) * per).map((t) => ({ ...t, name: t.id.toUpperCase() })),
    })).filter((c) => c.topics.length),
  });
}

describe("all prerequisites of a topic", () => {
  it("is empty for a topic with no prerequisites", () => {
    expect(allPrerequisites(g, "coulombs-law").size).toBe(0);
    expect(studyOrder(g, "coulombs-law")).toEqual(["coulombs-law"]);
  });

  it("follows the chain all the way back", () => {
    expect([...allPrerequisites(g, "gauss-law")].sort()).toEqual([
      "coulombs-law",
      "electric-field",
      "electric-flux",
    ]);
    expect(studyOrder(g, "gauss-law")).toEqual([
      "coulombs-law",
      "electric-field",
      "electric-flux",
      "gauss-law",
    ]);
  });

  it("orders a long chain so every topic comes after what it builds on, ending at the target", () => {
    const order = studyOrder(g, "lcr-resonance");
    expect(order.length).toBe(allPrerequisites(g, "lcr-resonance").size + 1);
    expect(order.at(-1)).toBe("lcr-resonance");
    const at = new Map(order.map((id, i) => [id, i]));
    for (const e of g.edges) {
      if (at.has(e.from) && at.has(e.to)) expect(at.get(e.from)!).toBeLessThan(at.get(e.to)!);
    }
  });

  it("finds what a topic unlocks next", () => {
    expect(unlocks(g, "gauss-law")).toContain("gauss-law-applications");
  });
});

describe("cleaning the map", () => {
  it("drops an arrow A → C when A → B → C already says it", () => {
    const s = subjectWith([
      { id: "a" },
      { id: "b", requires: ["a"] },
      { id: "c", requires: ["a", "b"] },
    ]);
    expect(withoutShortcuts(graphOf(s))).toEqual([
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ]);
  });

  it("reports cycles and links to missing topics instead of drawing them", () => {
    expect(
      graphProblems(
        subjectWith([
          { id: "a", requires: ["b"] },
          { id: "b", requires: ["a"] },
        ]),
      )[0],
    ).toContain("in a circle");
    expect(graphProblems(subjectWith([{ id: "a", requires: ["ghost"] }]))[0]).toContain(
      "doesn't exist (ghost)",
    );
    for (const s of subjects) expect(graphProblems(s)).toEqual([]);
  });
});

describe("layout", () => {
  const overlaps = (nodes: { x: number; y: number; w: number; h: number }[]) =>
    nodes.some((a, i) =>
      nodes.some(
        (b, j) => j > i && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h,
      ),
    );

  it("places every topic once, in columns by depth, with no overlapping boxes", () => {
    const l = layoutGraph(g);
    expect(l.nodes).toHaveLength(g.topics.length);
    expect(overlaps(l.nodes)).toBe(false);
    const d = depths(g);
    const x = new Map(l.nodes.map((n) => [n.id, n.x]));
    // Arrows always go to a later column.
    for (const e of l.edges) expect(x.get(e.from)!).toBeLessThan(x.get(e.to)!);
    expect(x.get("coulombs-law")).toBeLessThan(x.get("gauss-law")!);
    expect(d.get("gauss-law")).toBe(3);
    expect(l.nodes[0].w).toBe(NODE_W);
    expect(l.nodes[0].h).toBe(NODE_H);
  });

  it("turns on its side for phones, and folds a collapsed chapter into one box", () => {
    const v = layoutGraph(g, { vertical: true });
    const y = new Map(v.nodes.map((n) => [n.id, n.y]));
    expect(y.get("coulombs-law")).toBeLessThan(y.get("gauss-law")!);
    expect(overlaps(v.nodes)).toBe(false);
    const c = layoutGraph(g, { collapsed: new Set(["electrostatics"]) });
    const box = c.nodes.find((n) => n.id === "chapter:electrostatics");
    expect(box).toMatchObject({ kind: "chapter", count: 8 });
    expect(c.nodes.some((n) => n.id === "gauss-law")).toBe(false);
    expect(c.edges.some((e) => e.from === "chapter:electrostatics")).toBe(true);
    expect(overlaps(c.nodes)).toBe(false);
  });

  it("stays fast and tidy with 150 topics", () => {
    const many = Array.from({ length: 150 }, (_, i) => ({
      id: `t${i}`,
      requires: i === 0 ? [] : [`t${Math.floor(i / 2)}`, ...(i > 3 ? [`t${i - 3}`] : [])],
    }));
    const s = subjectWith(many, 10);
    const started = performance.now();
    const l = layoutGraph(graphOf(s));
    expect(performance.now() - started).toBeLessThan(1500);
    expect(overlaps(l.nodes)).toBe(false);
  });
});
