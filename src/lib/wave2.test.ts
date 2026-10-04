import { describe, expect, it } from "vitest";
import { curatedVideos } from "@/data/curatedLinks";
import { graphProblems } from "@/lib/graph/prereqGraph";
import { sourcesForTopic } from "@/lib/sources";
import { findSubject, subjectsFor } from "@/lib/subjects";

/* Wave 2: CE, IT, ICT and ECE core subjects (V3 · Step 8, SPEC §12.1). */
const CS = [
  "dsa",
  "oop",
  "dbms",
  "operating-systems",
  "computer-networks",
  "coa",
  "discrete-maths",
  "theory-of-computation",
  "compiler-design",
  "software-engineering",
  "web-technologies",
  "ai-ml",
];
const ECE = [
  "digital-logic",
  "signals-systems",
  "network-theory",
  "analog-electronics",
  "communication-systems",
  "dsp",
  "microprocessors",
  "em-theory",
  "vlsi",
];

describe("Wave 2 subjects", () => {
  it("has all 21 subjects (12 computing, 9 electronics)", () => {
    for (const id of [...CS, ...ECE]) expect(findSubject(id), id).toBeDefined();
  });

  it("shows computing subjects to CE, IT and ICT, and electronics subjects to ECE", () => {
    for (const branch of ["ce", "it", "ict"]) {
      const ids = subjectsFor(branch).map((s) => s.id);
      for (const id of CS) expect(ids, `${branch} → ${id}`).toContain(id);
    }
    const ece = subjectsFor("ece").map((s) => s.id);
    for (const id of ECE) expect(ece, id).toContain(id);
    // Network Theory is also Electrical Engineering's Circuit Theory (stored once).
    expect(findSubject("network-theory")!.branches).toContain("ee");
    // A later-year subject is not offered to first-year students.
    expect(subjectsFor("ce", 1).map((s) => s.id)).not.toContain("compiler-design");
  });

  it("records a real syllabus source and grounds every topic", () => {
    for (const id of [...CS, ...ECE]) {
      const s = findSubject(id)!;
      expect(s.syllabusSource.kind, id).not.toBe("none");
      expect(s.syllabusSource.url, id).toMatch(/^https:\/\//);
      for (const c of s.chapters) {
        for (const t of c.topics)
          expect(sourcesForTopic(id, t.id).length, `${id}/${t.id}`).toBeGreaterThan(0);
      }
      expect(graphProblems(s), id).toEqual([]);
    }
  });

  it("recommends NPTEL courses first where one exists", () => {
    for (const id of [
      "dsa",
      "dbms",
      "operating-systems",
      "theory-of-computation",
      "signals-systems",
      "vlsi",
    ]) {
      expect(curatedVideos[id]?.[0]?.publisher, id).toBe("NPTEL");
    }
  });
});
