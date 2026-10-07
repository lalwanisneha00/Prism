import { describe, expect, it } from "vitest";
import {
  buildGraph,
  findCycle,
  gapsBefore,
  layers,
  neighbourhood,
  topicStatuses,
  type ConceptGraph,
} from "@/lib/conceptMap";
import type { QuizAttempt } from "@/lib/storage/db";
import { subjects } from "@/lib/subjects";

const tiny: ConceptGraph = {
  nodes: new Map(
    ["a", "b", "c", "d", "e"].map((id) => [
      id,
      { id, name: id.toUpperCase(), chapterId: "ch", chapterName: "Chapter" },
    ]),
  ),
  // a → b → d, a → c → d, d → e
  edges: [
    { from: "a", to: "b" },
    { from: "a", to: "c" },
    { from: "b", to: "d" },
    { from: "c", to: "d" },
    { from: "d", to: "e" },
  ],
};

describe("concept map data", () => {
  it("every subject's prerequisites are real topics with no cycles", () => {
    for (const subject of subjects) {
      const ids = new Set(subject.chapters.flatMap((c) => c.topics.map((t) => t.id)));
      for (const t of subject.chapters.flatMap((c) => c.topics)) {
        for (const r of t.requires ?? []) expect(ids, `${t.id} requires ${r}`).toContain(r);
      }
      const graph = buildGraph(subject);
      expect(findCycle(graph), subject.id).toBeNull();
      // Most topics are connected to the map (a unit with a single topic has no arrows).
      const linked = new Set(graph.edges.flatMap((e) => [e.from, e.to]));
      expect(linked.size / graph.nodes.size).toBeGreaterThan(0.7);
    }
  });

  it("detects a cycle", () => {
    expect(findCycle({ ...tiny, edges: [...tiny.edges, { from: "e", to: "a" }] })).toEqual([
      "a",
      "b",
      "d",
      "e",
      "a",
    ]);
  });
});

describe("layouts", () => {
  it("puts each topic one layer after its deepest prerequisite", () => {
    expect(Object.fromEntries(layers(tiny))).toEqual({ a: 0, b: 1, c: 1, d: 2, e: 3 });
  });

  it("shows two steps back and one step forward around a topic", () => {
    const { layer, edges } = neighbourhood(tiny, "d");
    expect(Object.fromEntries(layer)).toEqual({ d: 0, b: -1, c: -1, a: -2, e: 1 });
    expect(edges).toHaveLength(5);
    expect(Object.fromEntries(neighbourhood(tiny, "d", 1, 0).layer)).toEqual({
      d: 0,
      b: -1,
      c: -1,
    });
  });

  it("works on real data: Gauss's law needs flux, which needs the field", () => {
    const em = buildGraph(subjects.find((s) => s.id === "em")!);
    const { layer } = neighbourhood(em, "gauss-law");
    expect(layer.get("electric-flux")).toBe(-1);
    expect(layer.get("electric-field")).toBe(-2);
    expect(layer.get("gauss-law-applications")).toBe(1);
  });
});

describe("progress on the map", () => {
  const attempt = (topic: string, score: number, at: number): QuizAttempt => ({
    id: `${topic}@${at}`,
    updatedAt: at,
    deleted: false,
    lessonId: topic,
    subject: "x",
    chapter: "ch",
    topic,
    level: "first-encounter",
    duration: 10,
    title: topic,
    score,
    total: 10,
    at,
  });

  it("uses each topic's latest score", () => {
    const statuses = topicStatuses([
      attempt("a", 3, 1),
      attempt("a", 9, 2), // improved: mastered
      attempt("b", 4, 1),
      attempt("c", 7, 1),
    ]);
    expect(Object.fromEntries(statuses)).toEqual({ a: "mastered", b: "weak", c: "tried" });
    expect(gapsBefore(tiny, "d", statuses)).toEqual(["b"]);
  });
});
