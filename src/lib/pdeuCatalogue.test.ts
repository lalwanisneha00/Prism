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
        // Retired chapters (not in the current handout) stay in the file but are not counted. A
        // merged course (migration 005) may hold a unit carried over from another branch's copy.
        const listed = subject!.chapters.filter((ch) => ch.status !== "retired");
        const own = listed.filter((ch) => !ch.movedFrom || ch.movedFrom.subject === subject!.id);
        expect(unitTitles.length, `${id}/${c.key} units`).toBeGreaterThanOrEqual(own.length);
        expect(unitTitles.length, `${id}/${c.key} units`).toBeLessThanOrEqual(listed.length);
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

describe("syllabus fix, admin corrections (migration 005)", () => {
  const COMMON_NON_CORE = ["24HS101T", "24HS102T", "24HS103T", "24HS104T", "24HS105T", "24CV101T"];

  it("puts every first-year course of a branch's course table at the top of its semester search", async () => {
    const map = subjectMap as Record<string, string>;
    for (const id of PDEU_BRANCH_IDS) {
      const b = await loadPdeuBranch(id);
      for (const row of b.subjects.filter((s) => s.semester <= 2)) {
        const subjectId = map[`${id}/${row.key}`];
        // Only course-table rows with no course anywhere (a placeholder like "Humanities - 1").
        if (!subjectId) {
          const code = row.code?.toUpperCase();
          const same = subjects.filter((s) => code && s.offerings?.some((o) => o.code === code));
          expect(
            same.map((s) => s.id),
            `${id}/${row.key} ${code}`,
          ).toEqual([]);
          continue;
        }
        // A row that is a lab on Prism (Engineering Graphics, migration 009) is hidden from
        // search until Phase 7B, like every lab; it must still be offered in that semester.
        const course = findSubject(subjectId)!;
        if (course.courseType === "practical") {
          expect(
            course.offerings?.some((o) => o.branch === id && o.semester === row.semester),
            `${id}/${row.key} (lab)`,
          ).toBe(true);
          continue;
        }
        expect(
          subjectsFor(id, row.semester).map((s) => s.id),
          `${id}/${row.key}`,
        ).toContain(subjectId);
      }
    }
  });

  it("COMP semester 1 lists Indian Knowledge System once, with no branch label", () => {
    const iks = subjects.filter((s) => /indian knowledge system/i.test(s.name));
    expect(iks).toHaveLength(1);
    expect(iks[0].name).toBe("Indian Knowledge System");
    expect(subjectsFor("ce", 1)).toContain(iks[0]);
    for (const b of ["ict", "ece", "civil", "elec"]) expect(subjectsFor(b, 1)).toContain(iks[0]);
    for (const b of ["petro", "biotech", "me", "chem"]) expect(subjectsFor(b, 2)).toContain(iks[0]);
  });

  it("has one shared course for each common non-core first-year course", () => {
    for (const code of COMMON_NON_CORE) {
      const copies = subjects.filter((s) => s.offerings?.some((o) => o.code === code));
      expect(
        copies.map((s) => s.id),
        code,
      ).toHaveLength(1);
      expect(copies[0].name).not.toMatch(/\((?:ce|ict|ece|civil|petro|biotech)\b/i);
    }
  });

  it("retires merged copies softly: they still resolve and forward to the main copy", () => {
    const old = findSubject("pdeu-indian-knowledge-system-ict-ece-civil")!;
    expect(old.status).toBe("retired");
    expect(old.movedTo).toBe("pdeu-indian-knowledge-system-petro");
    expect(old.chapters.length).toBeGreaterThan(0);
  });

  it("Biological Systems for Engineers: COMP semester 2 only (migrations 005, 007), other branches untouched", () => {
    const bio = findSubject("pdeu-biological-systems-for-engineers")!;
    expect(bio.status ?? "active").toBe("active");
    expect(bio.confidence).toBe("verified");
    expect(bio.semesters).toEqual([2]);
    for (let sem = 1; sem <= 8; sem++)
      expect(subjectsFor("ce", sem).includes(bio), `ce sem ${sem}`).toBe(sem === 2);
    const chem = findSubject("pdeu-biological-systems-for-engineers-chem")!;
    expect(subjectsFor("chem", 1)).toContain(chem);
  });

  it("COMP takes Organisational Behaviour in semester 1 (migration 006), other branches untouched", () => {
    const ob = findSubject("pdeu-organizational-behavior")!;
    expect(subjectsFor("ce", 1)).toContain(ob);
    expect(subjectsFor("ce", 2)).not.toContain(ob);
    for (const b of ["ict", "ece", "civil", "petro", "biotech"])
      expect(subjectsFor(b, 2)).toContain(ob);
    expect(subjectsFor("chem", 1)).toContain(ob);
  });

  it("COMP takes Workshop Practice in semester 2 (migration 008), other branches untouched", () => {
    // A lab: hidden from subjectsFor until Phase 7B, so check its offerings.
    const semOf = (branch: string) =>
      findSubject("pdeu-workshop-practice-ece")!
        .offerings!.filter((o) => o.branch === branch)
        .map((o) => o.semester);
    expect(semOf("ce")).toEqual([2]);
    for (const b of ["ece", "elec", "civil", "biotech", "petro"]) expect(semOf(b)).toEqual([1]);
    expect(semOf("chem")).toEqual([2]);
  });

  it("Engineering Graphics is a lab, in COMP sem 1 only (migration 009)", () => {
    const graphics = findSubject("pdeu-engineering-graphics-ce-petro")!;
    expect(graphics.courseType).toBe("practical");
    expect(graphics.offerings!.filter((o) => o.branch === "ce").map((o) => o.semester)).toEqual([
      1,
    ]);
    const lab = findSubject("pdeu-engineering-graphics-laboratory-ece")!;
    expect(lab.offerings!.some((o) => o.branch === "ce")).toBe(false);
    expect(lab.offerings!.map((o) => o.branch).sort()).toEqual(["civil", "ece", "elec"]);
  });
});
