import { describe, expect, it } from "vitest";
import branchData from "@/data/branches.json";
import { graphProblems } from "@/lib/graph/prereqGraph";
import { sourcesForTopic } from "@/lib/sources";
import { findSubject, semestersFor, subjectsFor } from "@/lib/subjects";

/* Wave 4: Chemical and Petroleum core (towards `tested`) and the other branches (`sourced`). */
const CHEM = [
  "process-calculations",
  "fluid-particle-operations",
  "heat-transfer",
  "mass-transfer",
  "chemical-reaction-engineering",
  "chemical-thermodynamics",
  "process-control",
];
const PETRO = [
  "petroleum-geology",
  "drilling-engineering",
  "reservoir-engineering",
  "petroleum-production",
  "well-logging",
  "petroleum-refining",
];
const OTHERS: Record<string, string[]> = {
  aero: ["aerodynamics", "aircraft-propulsion", "flight-dynamics"],
  auto: ["automotive-engines", "automotive-chassis-transmission", "vehicle-dynamics"],
  ic: ["transducers-sensors", "analytical-instruments", "process-control", "control-systems"],
  biotech: ["biochemistry", "molecular-biology", "genetic-engineering", "bioprocess-engineering"],
  meta: ["phase-transformations", "mechanical-metallurgy", "extractive-metallurgy"],
  mining: [
    "mine-environment-ventilation",
    "drilling-blasting",
    "mining-methods",
    "rock-mechanics",
    "mineral-processing",
  ],
};

describe("Wave 4 subjects", () => {
  it("offers the Chemical and Petroleum core to their branches", () => {
    const chem = subjectsFor("chem").map((s) => s.id);
    for (const id of CHEM) expect(chem, id).toContain(id);
    const petro = subjectsFor("petro").map((s) => s.id);
    for (const id of PETRO) expect(petro, id).toContain(id);
  });

  it("gives every other branch its own core subjects", () => {
    for (const [branch, ids] of Object.entries(OTHERS)) {
      const offered = subjectsFor(branch).map((s) => s.id);
      for (const id of ids) expect(offered, `${branch} → ${id}`).toContain(id);
    }
  });

  it("now has later-year subjects for every branch in the catalogue", () => {
    for (const b of branchData.branches) {
      expect(Math.max(...semestersFor(b.id)), b.id).toBeGreaterThan(2);
    }
  });

  it("records a real syllabus source and grounds every topic", () => {
    const all = [...CHEM, ...PETRO, ...Object.values(OTHERS).flat()];
    for (const id of new Set(all)) {
      const s = findSubject(id)!;
      expect(s, id).toBeDefined();
      expect(["aicte", "university"], id).toContain(s.syllabusSource.kind);
      expect(s.syllabusSource.url, id).toMatch(/^https:\/\//);
      for (const c of s.chapters) {
        for (const t of c.topics)
          expect(sourcesForTopic(id, t.id).length, `${id}/${t.id}`).toBeGreaterThan(0);
      }
      expect(graphProblems(s), id).toEqual([]);
    }
  });
});
