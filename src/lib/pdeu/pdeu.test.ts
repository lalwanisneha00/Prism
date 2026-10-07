import { describe, expect, it } from "vitest";
import {
  codeText,
  coursesOf,
  findCourse,
  ltpText,
  nameKey,
  prismMatch,
  semesterCredits,
  toDraftChapters,
} from "@/lib/pdeu/helpers";
import { loadPdeuBranch, loadRawPdeuBranch, PDEU_BRANCH_IDS, isPdeuBranch } from "@/lib/pdeu/load";

describe("PDEU syllabus data", () => {
  it("every branch passes its schema and has all eight semesters", async () => {
    for (const id of PDEU_BRANCH_IDS) {
      const b = await loadPdeuBranch(id);
      expect(b.id).toBe(id);
      for (let sem = 1; sem <= 8; sem++) {
        expect(
          b.subjects.some((s) => s.semester === sem),
          `${id} sem ${sem}`,
        ).toBe(true);
      }
    }
  });

  it("course keys are unique inside a branch", async () => {
    for (const id of PDEU_BRANCH_IDS) {
      const b = await loadPdeuBranch(id);
      const keys = b.subjects.flatMap((s) => [s.key, ...(s.options ?? []).map((o) => o.key)]);
      expect(new Set(keys).size, id).toBe(keys.length);
    }
  });

  it("the credits of the listed courses add up to the handbook's table (before the owner's decisions)", async () => {
    for (const id of PDEU_BRANCH_IDS) {
      const b = await loadRawPdeuBranch(id);
      for (let sem = 1; sem <= 8; sem++) {
        const printed = b.credits[String(sem)];
        const core = coursesOf(b, sem, true).reduce((n, s) => n + s.credits, 0);
        const notCore = coursesOf(b, sem, false).reduce((n, s) => n + s.credits, 0);
        // Mechanical semester 8 has two alternative project routes, so its courses add up to more.
        if (id === "me" && sem === 8) continue;
        expect({ id, sem, core, notCore }).toEqual({
          id,
          sem,
          core: printed.core,
          notCore: printed.notCore,
        });
      }
    }
  });

  it("applies the owner's decisions: Workshop Practices is out of CE semester 1, EVS is non-core", async () => {
    const ce = await loadPdeuBranch("ce");
    const sem1 = ce.subjects.filter((c) => c.semester === 1);
    expect(sem1.some((c) => c.name === "Workshop Practices")).toBe(false);
    expect(sem1.find((c) => c.name === "Environment Science")?.core).toBe(false);
    expect(semesterCredits(ce, 1)).toEqual({ core: 12, notCore: 7, total: 19 });
    // The same course stays in the other branches.
    const ict = await loadPdeuBranch("ict");
    expect(ict.subjects.some((c) => c.semester === 1 && c.name === "Workshop Practices")).toBe(
      true,
    );
  });

  it("an elective slot either lists its options or says where they are", async () => {
    for (const id of PDEU_BRANCH_IDS) {
      const b = await loadPdeuBranch(id);
      for (const s of b.subjects.filter((x) => x.options || x.optionsListedUnder)) {
        expect(s.options?.length || s.optionsListedUnder, `${id} ${s.name}`).toBeTruthy();
      }
    }
  });
});

describe("PDEU helpers", () => {
  it("normalises course names", () => {
    expect(nameKey("Mathematics - 1")).toBe("mathematics i");
    expect(nameKey("Elements of Electrical & Electronics Engineering")).toBe(
      "elements of electrical and electronics engineering",
    );
    expect(nameKey("Fluid Mechanics (with lab)")).toBe("fluid mechanics");
  });

  it("finds the Prism subject for a PDEU course", () => {
    expect(prismMatch("Applied Physics")?.subject).toBe("applied-physics");
    expect(prismMatch("Mathematics - II")?.part).toBe(true);
    expect(prismMatch("Concrete Technology")).toBeUndefined();
  });

  it("reads L-T-P in words", () => {
    expect(ltpText("3-1-0")).toBe("3 lecture · 1 tutorial");
    expect(ltpText("0-0-2")).toBe("2 practical");
    expect(ltpText(undefined)).toBe("");
  });

  it("looks up courses and elective options, and makes chapters from units", async () => {
    const ce = await loadPdeuBranch("ce");
    expect(isPdeuBranch("ce")).toBe(true);
    expect(isPdeuBranch("ee")).toBe(false);
    const physics = ce.subjects.find((s) => s.name === "Applied Physics");
    expect(physics?.credits).toBe(3);
    expect(codeText(physics!)).toBe("24PH101T");
    expect(semesterCredits(ce, 1).total).toBe(19);
    const chapters = toDraftChapters(physics!);
    expect(chapters).toHaveLength(4);
    expect(chapters[0].name).toBe("Electricity and Magnetism");
    const slot = ce.subjects.find((s) => s.options && s.options.length > 0)!;
    const option = findCourse(ce, slot.options![0].key);
    expect(option?.name).toBe(slot.options![0].name);
    expect(option?.semester).toBe(slot.semester);
  });
});
