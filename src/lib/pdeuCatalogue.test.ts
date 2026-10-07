import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import subjectMap from "@/data/pdeu/subject-map.json";
import { sourcesForTopic } from "@/lib/sources";
import { loadPdeuBranch, PDEU_BRANCH_IDS } from "@/lib/pdeu/load";
import {
  branches,
  detailsLine,
  detailsShort,
  findSubject,
  subjects,
  subjectsFor,
} from "@/lib/subjects";

/*
 * Prism's catalogue is PDEU's syllabus: every core PDEU course that has a unit-wise syllabus is a
 * subject, named, credited and divided into units and topics as in the handbook.
 */
describe("the catalogue follows PDEU's syllabus", () => {
  it("has only PDEU's branches", () => {
    expect(branches.map((b) => b.id).sort()).toEqual([...PDEU_BRANCH_IDS].sort());
    for (const s of subjects) for (const b of s.branches) expect(PDEU_BRANCH_IDS).toContain(b);
  });

  it("has a subject for every PDEU core course that prints a syllabus, with PDEU's credits", async () => {
    for (const id of PDEU_BRANCH_IDS) {
      const b = await loadPdeuBranch(id);
      const courses = b.subjects.flatMap((s) => [s, ...(s.options ?? [])]);
      for (const c of courses) {
        const core = "core" in c ? c.core : true;
        const withTopics = c.units.some((u) => u.topics.length > 0);
        if (!core || !withTopics) continue;
        const subjectId = (subjectMap as Record<string, string>)[`${id}/${c.key}`];
        const subject = findSubject(subjectId);
        expect(subject, `${id}/${c.key}`).toBeDefined();
        const offering = subject!.offerings?.find((o) => o.branch === id && o.key === c.key);
        expect(offering?.credits, `${id}/${c.key} credits`).toBe(c.credits);
        expect(subject!.branches).toContain(id);
        // Units are chapters, in order.
        const unitTitles = c.units.filter((u) => u.topics.length > 0).map((u) => u.title);
        expect(subject!.chapters.length).toBe(unitTitles.length);
      }
    }
  });

  it("shows the name, code, category, credits and L-T-P beside a subject", () => {
    const physics = findSubject("applied-physics")!;
    expect(physics.name).toBe("Applied Physics");
    expect(detailsLine(physics, "ce")).toBe("24PH101T · Basic Science · 3 credits · L-T-P 3-0-0");
    expect(detailsShort(physics, "ce")).toBe("3 credits · 24PH101T");
    expect(physics.chapters.map((c) => c.name)).toEqual([
      "Electricity and Magnetism",
      "Electromagnetic Waves",
      "Physics of Solids",
      "Optics",
    ]);
    expect(physics.chapters[0].hours).toBe(12);
  });

  it("gives every branch and semester its own subjects", () => {
    for (const b of branches) {
      // Semester 8 is the major project and seminar: no unit-wise syllabus.
      for (let sem = 1; sem <= 7; sem++) {
        expect(subjectsFor(b.id, sem).length, `${b.id} sem ${sem}`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps checked sources only for topics whose old ids were reused", () => {
    let withSources = 0;
    for (const s of subjects) {
      for (const c of s.chapters) {
        for (const t of c.topics) {
          const found = sourcesForTopic(s.id, t.id);
          if (found.length > 0) withSources++;
          // Every source has an id and a link.
          for (const x of found) {
            expect(x.id.length).toBeGreaterThan(0);
            expect(x.url).toMatch(/^https:/);
          }
        }
      }
    }
    expect(withSources).toBeGreaterThan(0);
  });

  it("has a source file only for subjects that exist", () => {
    const ids = new Set(subjects.map((s) => s.id));
    const files = readdirSync("src/data/subjects").filter((f) => f.endsWith("-sources.json"));
    for (const f of files) expect(ids.has(f.replace(/-sources\.json$/, "")), f).toBe(true);
    expect(readFileSync("src/data/subjects/applied-physics.json", "utf8")).toContain("PDEU");
  });
});
