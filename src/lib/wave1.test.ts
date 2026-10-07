import { describe, expect, it } from "vitest";
import { curatedVideos } from "@/data/curatedLinks";
import { graphProblems } from "@/lib/graph/prereqGraph";
import { sourcesForTopic } from "@/lib/sources";
import { chaptersOf, findSubject, subjectsFor } from "@/lib/subjects";

/* Wave 1: the first-year common core (V3 · Step 6, SPEC §12.1). */
const WAVE1 = [
  "engg-math",
  "applied-physics",
  "engg-chemistry",
  "basic-electrical",
  "basic-electronics",
  "engg-mechanics",
  "engg-graphics",
  "pps",
  "environmental-science",
];

describe("Wave 1 subjects", () => {
  it("are all in the catalogue, for every branch in semesters 1 and 2", () => {
    for (const id of WAVE1) {
      const s = findSubject(id);
      expect(s, id).toBeDefined();
      expect(s!.branches).toEqual(["all"]);
      expect(subjectsFor("me", 1).map((x) => x.id)).toContain(id);
    }
  });

  it("each record a real syllabus source with a link, never 'none'", () => {
    for (const id of WAVE1) {
      const src = findSubject(id)!.syllabusSource;
      expect(src.kind, id).not.toBe("none");
      expect(src.url, id).toMatch(/^https:\/\//);
    }
  });

  it("ground every topic in at least one checked source", () => {
    for (const id of WAVE1) {
      for (const c of findSubject(id)!.chapters) {
        for (const t of c.topics) {
          const sources = sourcesForTopic(id, t.id);
          expect(sources.length, `${id}/${t.id}`).toBeGreaterThan(0);
          expect(sources.some((s) => s.url?.startsWith("https://en.wikipedia.org/wiki/"))).toBe(
            true,
          );
        }
      }
    }
  });

  it("have prerequisite maps that can be drawn (no cycles, no missing topics)", () => {
    for (const id of WAVE1) expect(graphProblems(findSubject(id)!), id).toEqual([]);
  });

  it("make Applied Physics complete, with Electricity & Magnetism linked rather than copied", () => {
    const physics = findSubject("applied-physics")!;
    for (const chapter of [
      "mechanics",
      "oscillations",
      "waves",
      "optics",
      "lasers-fibre-optics",
      "quantum-physics",
      "solid-state",
      "thermodynamics",
    ]) {
      expect(physics.chapters.map((c) => c.id)).toContain(chapter);
    }
    const linked = chaptersOf(physics).filter((c) => c.owner.id === "em");
    expect(linked.length).toBe(findSubject("em")!.chapters.length);
    expect(physics.chapters.some((c) => c.id === "electrostatics")).toBe(false);
  });

  it("fill Engineering Maths' missing AICTE chapters without renaming old ones", () => {
    const ids = findSubject("engg-math")!.chapters.map((c) => c.id);
    expect(ids.slice(0, 7)).toEqual([
      "differential-calculus",
      "partial-differentiation",
      "integral-calculus",
      "linear-algebra",
      "differential-equations",
      "vector-calculus",
      "series-and-transforms",
    ]);
    expect(ids).toEqual(
      expect.arrayContaining([
        "complex-differentiation",
        "complex-integration",
        "special-functions",
      ]),
    );
  });

  it("teach Programming in C and Python, and Environmental Science as a theory subject", () => {
    const pps = findSubject("pps")!;
    expect(pps.visualSet).toBe("computing");
    expect(pps.chapters.some((c) => c.id === "python")).toBe(true);
    expect(findSubject("environmental-science")!.teaching).toBe("theory");
  });

  it("recommend NPTEL courses first where they exist", () => {
    for (const id of [
      "engg-chemistry",
      "basic-electrical",
      "basic-electronics",
      "engg-mechanics",
    ]) {
      expect(curatedVideos[id]?.[0]?.publisher, id).toBe("NPTEL");
    }
  });
});
