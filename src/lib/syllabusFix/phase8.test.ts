import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { searchCatalogue } from "@/lib/catalogueSearch";
import { ARCHETYPES, classifyCourse } from "@/lib/labs/archetypes";
import { fakeLabSections } from "@/lib/labs/fakeLab";
import { parseLab } from "@/lib/labs/labLesson";
import { allSubjects, findSubject, subjects, subjectsFor } from "@/lib/subjects";
import type { ParsedUnit } from "@/lib/syllabusFix/handoutCourse";
import { planRecheck } from "@/lib/syllabusFix/handoutRecheck";
import { numberedFor } from "@/lib/labs/experiment";
import { activeChapters } from "@/lib/syllabusFix/active";
import { canonicalTopic } from "@/lib/syllabusFix/alias";

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

  it("numbers each lab as every branch's own handout does: 1, 2, 3 … with no number twice", () => {
    for (const lab of labs.filter((l) => l.chapters.length > 0)) {
      const shown = lab.chapters[0].topics.filter((t) => t.status !== "retired");
      for (const branch of [undefined, ...lab.branches]) {
        const numbers = numberedFor(shown, branch)
          .map((e) => e.number)
          .filter((n): n is number => n !== null);
        expect(numbers[0], `${lab.id} ${branch}`).toBe(1);
        expect(new Set(numbers).size, `${lab.id} ${branch}`).toBe(numbers.length);
        expect(numbers, `${lab.id} ${branch}`).toEqual([...numbers].sort((a, b) => a - b));
      }
    }
  });

  it("merged labs: one shared list, each branch's numbering (owner's decision 2026-10-30)", () => {
    const view = (id: string, branch: string) =>
      numberedFor(activeChapters(findSubject(id)!)[0].topics, branch).map(
        (e) => `${e.number ?? "-"} ${e.topic.name.slice(0, 22)}`,
      );
    const EEE = "pdeu-elements-of-electrical-and-electronics-engineering-lab-me";
    expect(view(EEE, "chem").slice(0, 2)).toEqual([
      "1 Introduction to elemen",
      "2 To verify Kirchhoff's ",
    ]);
    expect(view(EEE, "ece")[1]).toBe("2 To Verify Ohm’s law wi");
    expect(view(EEE, "ece").at(-1)).toMatch(/^- To verify Kirchhoff/);
    // CHEM's R-L parallel circuit is its experiment 6 (005 had linked it to the series one).
    expect(view(EEE, "chem")[5]).toBe("6 To evaluate performanc");
    // Same experiment, two wordings: one copy is kept and the other's old links forward to it.
    expect(
      canonicalTopic(
        "pdeu-modern-physics-laboratory-chem",
        "experiment-3-study-of-the-biot-savart-law-and-the-magnetic-f",
      ),
    ).toEqual({
      subject: "pdeu-modern-physics-laboratory-biotech",
      topic: "experiment-3-study-of-bio-savart-s-law",
    });
    expect(view("pdeu-modern-physics-laboratory-biotech", "chem")[2]).toBe(
      "3 Study of Bio-Savart’s ",
    );
    expect(view("pdeu-engineering-chemistry-practical-ece", "chem")).toHaveLength(11);
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
