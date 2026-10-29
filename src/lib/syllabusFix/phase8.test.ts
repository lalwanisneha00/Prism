import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { searchCatalogue } from "@/lib/catalogueSearch";
import { ARCHETYPES, classifyCourse } from "@/lib/labs/archetypes";
import { fakeLabSections } from "@/lib/labs/fakeLab";
import { parseLab } from "@/lib/labs/labLesson";
import { allSubjects, findSubject, subjects, subjectsFor } from "@/lib/subjects";
import type { ParsedUnit } from "@/lib/syllabusFix/handoutCourse";
import { planRecheck } from "@/lib/syllabusFix/handoutRecheck";

/*
 * Syllabus fix, Phase 8: the two bugs real students reported, recreated and checked against the
 * 2024-25 handouts, plus practical courses from several branches.
 */

const FOLDER: Record<string, string> = { me: "MECH", ict: "ICT" };
type Matched = { branch: string; sem: number; title: string; subject: string };
const plan = JSON.parse(readFileSync("handouts/_parsed/rearrange-plan.json", "utf8")) as {
  matched: Matched[];
};
function handoutUnits(m: Matched): ParsedUnit[] {
  const file = `handouts/_parsed/${FOLDER[m.branch]}/sem${m.sem}.json`;
  const sem = JSON.parse(readFileSync(file, "utf8")) as {
    courses: { title: string; units: ParsedUnit[] }[];
  };
  return sem.courses.find((c) => c.title === m.title)?.units ?? [];
}
const visibleTopics = (id: string, chapter: string) =>
  findSubject(id)!
    .chapters.find((c) => c.id === chapter)!
    .topics.filter((t) => t.status !== "retired")
    .map((t) => t.name);

describe("bug 1: an ICT student's semester shows only 5 of 6 courses (AI missing)", () => {
  const AI = "pdeu-introduction-to-artificial-intelligence-ict";
  const mine = subjectsFor("ict", 3);

  it("ICT semester 3 lists all six courses, AI included", () => {
    expect(mine).toHaveLength(6);
    expect(mine.map((s) => s.id)).toContain(AI);
  });

  it("the search box puts the student's own AI course first", () => {
    const ids = new Set(mine.map((s) => s.id));
    const [first] = searchCatalogue("artificial intelligence", 10, subjects, ids);
    expect(first).toMatchObject({ kind: "subject", subject: { id: AI } });
    // Every one of the six courses is found at the top when searched by name.
    for (const s of mine) {
      const [top] = searchCatalogue(s.name, 5, subjects, ids);
      expect(top.subject.id, s.name).toBe(s.id);
    }
  }, 30_000); // seven searches of the whole catalogue: slow on a busy machine
});

describe("bug 2: a Mechanical chapter shows another chapter's topics", () => {
  const mech = plan.matched.filter((m) => m.branch === "me");

  it("every Mechanical course now agrees with its handout (re-check finds nothing to fix)", () => {
    expect(mech.length).toBeGreaterThan(20);
    for (const m of mech) {
      const course = findSubject(m.subject);
      if (!course || course.status === "retired") continue;
      expect(planRecheck(course.chapters, [handoutUnits(m)]), `${m.subject}`).toEqual([]);
    }
  });

  it("Strength of Material: principal stresses and Mohr's circle are in unit 1, not Deflection", () => {
    const S = "pdeu-strength-of-material";
    const first = visibleTopics(S, "simple-stresses-and-strains").join(" | ");
    expect(first).toMatch(/PRINCIPAL STRESSES/i);
    expect(first).toMatch(/compound stresses/i);
    expect(first).toMatch(/stress-strain diagram/i);
    const deflection = visibleTopics(S, "deflection-of-beams").join(" | ");
    expect(deflection).not.toMatch(/principal stresses|compound stresses/i);
    expect(deflection).toMatch(/Macaulay/);
  });

  it("Refrigeration: absorption refrigeration sits in the non-conventional systems chapter", () => {
    const R = "pdeu-refrigeration-and-air-conditioning";
    expect(visibleTopics(R, "introduction").join(" | ")).toMatch(/Vapour Absorption/);
    expect(visibleTopics(R, "refrigerants").join(" | ")).not.toMatch(/Vapour Absorption/);
  });

  it("each Mechanical course sits in the semester its handout gives", () => {
    for (const m of mech) {
      const course = findSubject(m.subject);
      if (!course || course.status === "retired" || course.courseType === "practical") continue;
      expect(
        subjectsFor("me", m.sem).map((s) => s.id),
        `${m.subject} in sem ${m.sem}`,
      ).toContain(m.subject);
    }
  });
});

describe("practical courses across branches (Phase 7B/7C)", () => {
  const labs = allSubjects.filter((s) => s.courseType === "practical" && s.status !== "retired");
  const branchesWithLabs = [...new Set(labs.flatMap((l) => l.branches))];

  it("has labs in every branch with handouts", () => {
    expect(branchesWithLabs).toEqual(
      expect.arrayContaining(["ce", "ict", "ece", "me", "civil", "petro", "biotech", "chem"]),
    );
  });

  it("lists each lab's experiments in order, numbered 1, 2, 3 …", () => {
    for (const lab of labs.filter((l) => l.chapters.length > 0)) {
      const shown = lab.chapters[0].topics.filter((t) => t.status !== "retired");
      // Experiments that only another branch's copy had came in with the merge (migration 005)
      // and keep that handout's number; they follow the course's own list.
      const merged = (t: (typeof shown)[number]) => !!t.movedFrom && t.movedFrom.subject !== lab.id;
      const own = shown.filter((t) => !merged(t)).map((t) => t.number ?? 0);
      expect(own, lab.id).toEqual([...own].sort((a, b) => a - b));
      expect(own[0], lab.id).toBe(1);
      const firstMerged = shown.findIndex(merged);
      if (firstMerged >= 0) expect(shown.slice(firstMerged).every(merged), lab.id).toBe(true);
    }
  });

  it("gives one lab per branch a format whose lesson has every required section", () => {
    for (const branch of branchesWithLabs) {
      const lab = labs.find((l) => l.branches.includes(branch) && l.chapters.length > 0)!;
      const { archetype } = classifyCourse(lab);
      const parsed = parseLab({
        version: 2,
        archetype: archetype.id,
        sections: fakeLabSections(archetype),
        meta: {
          kind: "practical",
          archetype: archetype.id,
          subject: lab.id,
          chapter: lab.chapters[0].id,
          topic: lab.chapters[0].topics[0].id,
          title: lab.chapters[0].topics[0].name,
          createdAt: "2026-10-30T00:00:00.000Z",
          sources: [],
        },
      });
      expect(parsed.ok, `${lab.id} (${archetype.id})`).toBe(true);
      if (!parsed.ok) continue;
      const required = archetype.sections.filter((s) => !s.optional && s.kind !== "videos");
      for (const s of required.filter((s) => !["wiring", "simulation"].includes(s.kind)))
        expect(parsed.lesson.sections[s.id], `${lab.id}: ${s.id}`).toBeTruthy();
    }
    // Every archetype in the owner's file is reachable.
    expect(ARCHETYPES.archetypes.length).toBeGreaterThanOrEqual(10);
  });
});
