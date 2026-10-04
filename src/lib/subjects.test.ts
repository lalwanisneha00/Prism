import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import lock from "@/lib/subjectIds.lock.json";
import {
  branches,
  branchesOf,
  catalogueProblems,
  chaptersOf,
  findSubject,
  semestersFor,
  subjects,
  subjectsFor,
  SubjectSchema,
  type Subject,
} from "@/lib/subjects";

const minimal = (over: Partial<Subject>): Subject =>
  SubjectSchema.parse({
    id: "x",
    name: "X",
    field: "Test",
    tier: "sourced",
    branches: ["ce"],
    semesters: [3],
    syllabusSource: { kind: "none", title: "No syllabus yet" },
    chapters: [{ id: "c1", name: "C1", topics: [{ id: "t1", name: "T1" }] }],
    ...over,
  });

describe("subject catalogue", () => {
  it("loads every subject file and finds no problems", () => {
    expect(subjects.length).toBeGreaterThanOrEqual(2);
    expect(catalogueProblems(subjects)).toEqual([]);
  });

  it("never renames or removes a published id (saved progress depends on them)", () => {
    const now = new Set(
      subjects.flatMap((s) =>
        s.chapters.flatMap((c) => c.topics.map((t) => `${s.id}/${c.id}/${t.id}`)),
      ),
    );
    const missing = lock.ids.filter((id) => !now.has(id));
    expect(missing).toEqual([]);
  });

  it("has an up-to-date generated index (one entry per JSON file)", () => {
    const dir = "src/data/subjects";
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    const index = readFileSync(`${dir}/index.generated.ts`, "utf8");
    for (const f of files) expect(index).toContain(`"./${f}"`);
    expect(subjects.length).toBe(files.filter((f) => !f.endsWith("-sources.json")).length);
  });

  it("records a syllabus source for every subject", () => {
    for (const s of subjects) expect(s.syllabusSource.title.length).toBeGreaterThan(0);
  });
});

describe("branches and semesters", () => {
  it("gives every branch the first-year common subjects", () => {
    for (const b of branches) {
      expect(subjectsFor(b.id).map((s) => s.id)).toEqual(
        expect.arrayContaining(["em", "engg-math"]),
      );
    }
    expect(subjectsFor("ce", 1).map((s) => s.id)).toContain("em");
    expect(subjectsFor("ce", 7)).toEqual([]);
    expect(semestersFor("me")).toEqual([1, 2]);
    expect(branchesOf(findSubject("em")!)).toHaveLength(branches.length);
  });
});

describe("catalogue checks", () => {
  it("spots duplicates, unknown branches, unknown prerequisites and broken links", () => {
    const a = minimal({
      id: "a",
      branches: ["ce", "wizardry"],
      chapters: [
        { id: "c1", name: "C1", topics: [{ id: "t1", name: "T1", requires: ["nope"] }] },
        { id: "c1", name: "Again", topics: [{ id: "t1", name: "Twice" }] },
      ],
      links: [{ subject: "ghost" }, { subject: "b", chapters: ["missing"] }],
    });
    const b = minimal({ id: "b" });
    const problems = catalogueProblems([a, b, b]);
    expect(problems).toEqual(
      expect.arrayContaining([
        'subject "b" appears twice',
        'a: unknown branch "wizardry"',
        'a: chapter "c1" appears twice',
        'a: topic "t1" appears twice',
        'a: t1 requires unknown topic "nope"',
        'a: links to unknown subject "ghost"',
        'a: links to unknown chapter "b/missing"',
      ]),
    );
  });

  it("shows linked chapters under their owner subject, without copying them", () => {
    const physics = minimal({
      id: "linked-physics",
      chapters: [],
      links: [{ subject: "em", chapters: ["electrostatics"] }],
    });
    expect(catalogueProblems([...subjects, physics])).toEqual([]);
    const list = chaptersOf(physics);
    expect(list).toHaveLength(1);
    expect(list[0].owner.id).toBe("em");
    expect(list[0].chapter.id).toBe("electrostatics");
  });
});
