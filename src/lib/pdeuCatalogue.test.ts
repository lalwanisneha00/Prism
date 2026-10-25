import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import subjectMap from "@/data/pdeu/subject-map.json";
import { sourcesForTopic } from "@/lib/sources";
import { loadPdeuBranch, loadRawPdeuBranch, PDEU_BRANCH_IDS } from "@/lib/pdeu/load";
import { allSubjects, branches, findSubject, subjects, subjectsFor } from "@/lib/subjects";

/*
 * Prism's catalogue is PDEU's syllabus: every core PDEU course that has a unit-wise syllabus is a
 * subject, named, credited and divided into units and topics as in the handbook.
 */
const HANDOUT_ONLY_BRANCHES = ["elec", "chem"];
const KNOWN_GAPS: string[] = [];
describe("the catalogue follows PDEU's syllabus", () => {
  it("has only PDEU's branches", () => {
    // Electrical and Chemical come from the 2024-25 handouts only (no handbook file yet).
    const all = [...PDEU_BRANCH_IDS, ...HANDOUT_ONLY_BRANCHES].sort();
    expect(branches.map((b) => b.id).sort()).toEqual(all);
    for (const s of subjects) for (const b of s.branches) expect(all).toContain(b);
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
        // Retired chapters (not in the current handout) stay in the file but are not counted.
        expect(subject!.chapters.filter((ch) => ch.status !== "retired").length).toBe(
          unitTitles.length,
        );
      }
    }
  });

  it("names a subject as PDEU does and lays out its units", () => {
    const physics = findSubject("pdeu-applied-physics")!;
    expect(physics.name).toBe("Applied Physics");
    expect(physics.courseCategory).toBe("core");
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
        // Semesters known to have no course yet (see docs/SYLLABUS_AUDIT.md) would be listed here.
        if (KNOWN_GAPS.includes(`${b.id}/${sem}`)) continue;
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
    const ids = new Set(allSubjects.map((s) => s.id));
    const files = readdirSync("src/data/subjects").filter((f) => f.endsWith("-sources.json"));
    for (const f of files) expect(ids.has(f.replace(/-sources\.json$/, "")), f).toBe(true);
    expect(readFileSync("src/data/subjects/pdeu-applied-physics.json", "utf8")).toContain("PDEU");
  });

  it("marks non-core subjects as skeletons with no curated sources", () => {
    const uhv = subjects.filter((s) => s.id.startsWith("pdeu-universal-human-values"));
    expect(uhv.length).toBeGreaterThan(0);
    for (const s of uhv) {
      expect(s.courseCategory).toBe("non-core");
      expect(s.tier).toBe("limited");
      for (const c of s.chapters)
        for (const t of c.topics) expect(sourcesForTopic(s.id, t.id)).toEqual([]);
    }
  });

  it("reuses existing topic ids (and their sources) for core subjects", () => {
    const physics = findSubject("pdeu-applied-physics")!;
    const ids = physics.chapters.flatMap((c) => c.topics.map((t) => t.id));
    expect(ids).toContain("faradays-law");
    expect(sourcesForTopic("pdeu-applied-physics", "faradays-law").length).toBeGreaterThan(0);
  });
});

describe("syllabus fix, Phase 2 (2024-25 handouts)", () => {
  it("Mechanical semester 7: one elective slot where the student takes three", async () => {
    const me = await loadPdeuBranch("me");
    const slot = me.subjects.find((s) => s.semester === 7 && s.options?.length)!;
    expect(slot.picks).toBe(3);
    expect(slot.options!.length).toBeGreaterThanOrEqual(9);
  });

  it("Electrical: the 2024 common first year, and unverified 2020-scheme courses from semester 3", () => {
    const sem2 = subjectsFor("elec", 2).map((s) => s.id);
    expect(sem2).toEqual(
      subjectsFor("ece", 2)
        .map((s) => s.id)
        .filter((id) => id !== "pdeu-introduction-to-electrical-engineering"),
    );
    expect(subjectsFor("elec", 1).map((s) => s.id)).toContain("pdeu-mathematics-i-ce-ece-civil");
    for (const s of allSubjects.filter(
      (x) => x.offerings?.every((o) => o.branch === "elec") && x.status !== "retired",
    ))
      expect(s.confidence, s.id).toBe("unverified");
  });

  it("never lists a course whose handbook entry is retired, nor two copies of one course", async () => {
    for (const id of PDEU_BRANCH_IDS) {
      const raw = await loadRawPdeuBranch(id);
      const retired = new Set(
        raw.subjects
          .flatMap((c) => [c, ...(c.options ?? [])])
          .filter((c) => c.retired)
          .map((c) => c.key),
      );
      for (const s of subjects)
        for (const o of s.offerings ?? [])
          if (o.branch === id) expect(retired.has(o.key), `${s.id} ${id}/${o.key}`).toBe(false);
    }
    const evs = subjectsFor("ece", 1).filter((s) => /environment/i.test(s.name));
    expect(evs.map((s) => s.id)).toEqual(["pdeu-environmental-science-biotech"]);
  });

  it("Mechanical semester 3 lists Engineering Mechanics and its own AI course", () => {
    const names = subjectsFor("me", 3).map((s) => s.name);
    expect(names).toContain("Engineering Mechanics");
    expect(names).toContain("Introduction to Artificial Intelligence in Mechanical Engineering");
  });

  it("ICT semester 3 lists all six courses, Introduction to Artificial Intelligence included", () => {
    const names = subjectsFor("ict", 3).map((s) => s.name);
    expect(names).toHaveLength(6);
    expect(names).toContain("Introduction to Artificial Intelligence");
    const ai = findSubject("pdeu-introduction-to-artificial-intelligence-ict")!;
    expect(ai.confidence).toBe("unverified");
    expect(ai.branches).toEqual(["ict"]);
  });

  it("Mechanical: spring design is no longer under Design of Shafts", () => {
    const course = findSubject("pdeu-design-and-kinematics-of-machines")!;
    const shafts = course.chapters.find((c) => c.name === "Design of Shafts")!;
    const active = shafts.topics.filter((t) => t.status !== "retired").map((t) => t.name);
    expect(active.some((t) => /spring/i.test(t))).toBe(false);
    // The moved topics keep their ids and remember where they came from.
    const moved = course.chapters.flatMap((c) => c.topics).filter((t) => t.movedFrom);
    expect(moved.some((t) => t.movedFrom?.chapter === shafts.id)).toBe(true);
  });

  it("uses each branch's own semester for a shared course", () => {
    const shared = subjects.find((s) => new Set(s.offerings?.map((o) => o.semester)).size > 1)!;
    const [a, b] = shared.offerings!.filter(
      (o, i, all) => all.findIndex((x) => x.semester === o.semester) === i,
    );
    expect(subjectsFor(a.branch, a.semester)).toContain(shared);
    if (
      a.branch !== b.branch &&
      !shared.offerings!.some((o) => o.branch === a.branch && o.semester === b.semester)
    )
      expect(subjectsFor(a.branch, b.semester)).not.toContain(shared);
  });

  it("keeps lab courses out of the lists until their lesson format exists", () => {
    const labs = allSubjects.filter((s) => s.courseType === "practical");
    expect(labs.length).toBeGreaterThan(100);
    for (const lab of labs) expect(subjects).not.toContain(lab);
    // Experiments are numbered; a lab whose handout lists none is empty, unverified (upload banner).
    for (const lab of labs) {
      if (lab.chapters.length === 0) expect(lab.confidence).toBe("unverified");
      else expect(lab.chapters[0].topics.every((t) => t.number)).toBe(true);
    }
    expect(labs.filter((l) => l.chapters.length === 0)).toHaveLength(4);
  });
});
