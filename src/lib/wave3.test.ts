import { describe, expect, it } from "vitest";
import { graphProblems } from "@/lib/graph/prereqGraph";
import { sourcesForTopic } from "@/lib/sources";
import { findSubject, subjectsFor } from "@/lib/subjects";

/* Wave 3: Electrical, Mechanical and Civil core subjects (V3 · Step 9, SPEC §12.1). */
const EE = [
  "electrical-machines",
  "power-systems",
  "power-electronics",
  "control-systems",
  "electrical-measurements",
];
const ME = [
  "engineering-thermodynamics",
  "heat-transfer",
  "fluid-mechanics",
  "strength-of-materials",
  "theory-of-machines",
  "machine-design",
  "manufacturing-processes",
  "engineering-materials",
];
const CIVIL = [
  "structural-analysis",
  "surveying",
  "geotechnical-engineering",
  "concrete-rcc-design",
  "hydraulic-engineering",
  "transportation-engineering",
  "environmental-engineering",
  "building-materials",
];

describe("Wave 3 subjects", () => {
  it("has all 21 subjects (5 electrical, 8 mechanical, 8 civil)", () => {
    for (const id of [...EE, ...ME, ...CIVIL]) expect(findSubject(id), id).toBeDefined();
  });

  it("shows each subject to its branch", () => {
    for (const [branch, ids] of [
      ["ee", EE],
      ["me", ME],
      ["civil", CIVIL],
    ] as const) {
      const offered = subjectsFor(branch).map((s) => s.id);
      for (const id of ids) expect(offered, `${branch} → ${id}`).toContain(id);
    }
    // Circuit Theory for EE is the Wave 2 Network Theory subject (stored once, SPEC §12.2).
    expect(subjectsFor("ee").map((s) => s.id)).toContain("network-theory");
    // Shared subjects: Strength of Materials and Fluid Mechanics are core for Civil too.
    const civil = subjectsFor("civil").map((s) => s.id);
    expect(civil).toEqual(expect.arrayContaining(["strength-of-materials", "fluid-mechanics"]));
    // Heat Transfer is shared with Chemical Engineering (Wave 4).
    expect(findSubject("heat-transfer")!.branches).toContain("chem");
  });

  it("records the AICTE syllabus source and grounds every topic", () => {
    for (const id of [...EE, ...ME, ...CIVIL]) {
      const s = findSubject(id)!;
      expect(s.syllabusSource.kind, id).toBe("aicte");
      expect(s.syllabusSource.url, id).toMatch(/^https:\/\/www\.aicte\.gov\.in\//);
      for (const c of s.chapters) {
        for (const t of c.topics)
          expect(sourcesForTopic(id, t.id).length, `${id}/${t.id}`).toBeGreaterThan(0);
      }
      expect(graphProblems(s), id).toEqual([]);
    }
  });
});
