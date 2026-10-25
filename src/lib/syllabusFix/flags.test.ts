import { describe, expect, it } from "vitest";
import {
  flagToChange,
  FLAG_MENU,
  lessonFlagId,
  LessonFlagSchema,
  missingSubjectChange,
  MissingSubjectSchema,
  SyllabusFlagSchema,
  type FlagCourse,
} from "@/lib/syllabusFix/flags";
import { compareStudentHandout } from "@/lib/syllabusFix/studentHandoutCompare";
import { findCandidates } from "@/lib/syllabusFix/missingSubject";
import { planFlag } from "@/lib/syllabusFix/proposalStore";
import { proposalId, type Vote } from "@/lib/syllabusFix/proposals";

const course: FlagCourse = {
  id: "c1",
  name: "Signals",
  code: "24EC201T",
  chapters: [
    {
      id: "a",
      name: "Basics",
      topics: [
        { id: "t1", name: "Sampling" },
        { id: "t2", name: "Noise" },
      ],
    },
    { id: "b", name: "Transforms", topics: [{ id: "t3", name: "Fourier" }] },
  ],
};
const place = { branch: "ece", sem: 3 };
const others = [
  { id: "c1", name: "Signals" },
  { id: "c2", name: "Systems" },
];

function change(flag: unknown) {
  const r = flagToChange(SyllabusFlagSchema.parse(flag), course, place, others);
  if (!r.ok) throw new Error(r.message);
  return r.change;
}

describe("flag menus", () => {
  it("has three choices on each level, every one a known flag type", () => {
    for (const items of Object.values(FLAG_MENU)) expect(items).toHaveLength(3);
    const types = SyllabusFlagSchema.options.map((o) => o.shape.type.value);
    expect(
      Object.values(FLAG_MENU)
        .flat()
        .map((i) => i.type)
        .sort(),
    ).toEqual([...types].sort());
  });
});

describe("flagToChange", () => {
  it("turns each flag into the matching change", () => {
    expect(change({ type: "course-wrong-semester", subject: "c1", semester: 4 })).toMatchObject({
      type: "course in wrong semester",
      sem: 4,
      to: { branch: "ece", semester: 4 },
    });
    expect(change({ type: "course-not-in-branch", subject: "c1" })).toMatchObject({
      type: "course in wrong branch",
      retire: true,
    });
    expect(change({ type: "course-duplicate", subject: "c1", other: "c2" })).toMatchObject({
      type: "course duplicate",
      to: { subject: "c2" },
    });
    expect(
      change({ type: "chapter-wrong-course", subject: "c1", chapter: "b", toSubject: "c2" }),
    ).toMatchObject({
      type: "unit under wrong course",
      prism: { chapter: "b" },
      to: { subject: "c2" },
    });
    expect(
      change({ type: "chapter-wrong-order", subject: "c1", chapter: "b", position: 1 }),
    ).toMatchObject({ type: "unit wrong order", to: { order: 1 } });
    expect(change({ type: "chapter-missing", subject: "c1", name: "Z transform" })).toMatchObject({
      type: "unit missing",
      handout: { unit: "Z transform" },
    });
    expect(
      change({
        type: "topic-wrong-chapter",
        subject: "c1",
        chapter: "a",
        topic: "t2",
        toChapter: "b",
      }),
    ).toMatchObject({ type: "topic under wrong unit", to: { chapter: "b" } });
    expect(
      change({ type: "topic-not-in-syllabus", subject: "c1", chapter: "a", topic: "t2" }),
    ).toMatchObject({ type: "extra item not in any handout", retire: true });
    expect(
      change({ type: "topic-missing", subject: "c1", chapter: "b", name: "Laplace" }),
    ).toMatchObject({ type: "topic missing", to: { chapter: "b" } });
  });

  it("refuses flags that point at nothing or change nothing", () => {
    const refuse = (flag: unknown) =>
      flagToChange(SyllabusFlagSchema.parse(flag), course, place, others).ok;
    expect(refuse({ type: "chapter-wrong-order", subject: "c1", chapter: "a", position: 1 })).toBe(
      false,
    );
    expect(refuse({ type: "chapter-wrong-order", subject: "c1", chapter: "a", position: 9 })).toBe(
      false,
    );
    expect(
      refuse({ type: "chapter-wrong-course", subject: "c1", chapter: "a", toSubject: "c1" }),
    ).toBe(false);
    expect(
      refuse({ type: "chapter-wrong-course", subject: "c1", chapter: "x", toSubject: "c2" }),
    ).toBe(false);
    expect(
      refuse({
        type: "topic-wrong-chapter",
        subject: "c1",
        chapter: "a",
        topic: "t1",
        toChapter: "a",
      }),
    ).toBe(false);
    expect(refuse({ type: "topic-missing", subject: "c1", chapter: "a", name: "noise" })).toBe(
      false,
    );
    expect(refuse({ type: "chapter-missing", subject: "c1", name: "Basics" })).toBe(false);
    expect(refuse({ type: "course-duplicate", subject: "c1", other: "zz" })).toBe(false);
  });

  it("rejects bad input at the schema", () => {
    expect(
      SyllabusFlagSchema.safeParse({ type: "course-wrong-semester", subject: "c1", semester: 9 })
        .success,
    ).toBe(false);
    expect(
      SyllabusFlagSchema.safeParse({
        type: "topic-missing",
        subject: "c1",
        chapter: "a",
        name: "x",
      }).success,
    ).toBe(false);
    expect(SyllabusFlagSchema.safeParse({ type: "nope", subject: "c1" }).success).toBe(false);
  });

  it("shares a proposal with a handout asking for the same thing", () => {
    // The handout lists unit "Basics" without "Noise": the matcher retires Noise, like the flag.
    const fromHandout = compareStudentHandout(
      {
        code: null,
        title: "Signals",
        courseType: "theory",
        units: [
          { order: 1, name: "Basics", topics: ["Sampling"] },
          { order: 2, name: "Transforms", topics: ["Fourier"] },
        ],
        experiments: [],
      },
      {
        ...course,
        chapters: course.chapters.map((c) => ({ ...c, topics: [...c.topics] })),
        offerings: [{ branch: "ece", semester: 3 }],
      },
      [],
      { ...place, fromProfile: true },
    ).find((c) => c.prism?.topic === "t2");
    const fromFlag = change({
      type: "topic-not-in-syllabus",
      subject: "c1",
      chapter: "a",
      topic: "t2",
    });
    expect(fromHandout).toBeDefined();
    expect(proposalId(fromFlag)).toBe(proposalId(fromHandout!));
  });
});

describe("planFlag", () => {
  const vote: Vote = { uid: "u1", kind: "flag", points: 1, profileFrom: "cloud", at: "2026-10-25" };
  const c = () =>
    change({ type: "topic-not-in-syllabus", subject: "c1", chapter: "a", topic: "t2" });

  it("adds one point once per student, and never reopens a settled proposal", () => {
    const first = planFlag(c(), undefined, false, vote);
    expect(first).toMatchObject({
      counted: true,
      status: "pending",
      proposal: { points: 1, voters: 1 },
    });
    const again = planFlag(c(), first.proposal!, true, vote);
    expect(again.counted).toBe(false);
    const applied = planFlag(c(), { ...first.proposal!, status: "applied" }, false, vote);
    expect(applied).toMatchObject({ counted: false, status: "applied", proposal: null });
  });
});

describe("My subject isn't here", () => {
  const catalogue = [
    {
      id: "ai-ce",
      name: "Introduction to Artificial Intelligence",
      code: "24CP305T",
      offerings: [{ branch: "ce", semester: 5 }],
    },
    {
      id: "ai-ict",
      name: "Introduction to Artificial Intelligence",
      offerings: [{ branch: "ict", semester: 3 }],
    },
    { id: "ml", name: "Machine Learning", offerings: [{ branch: "ict", semester: 5 }] },
  ];

  it("finds the same course by code first, then by name, and says if it is already listed", () => {
    const found = findCandidates(
      { name: "Artificial Intelligence", code: "24cp305t", semester: 3 },
      "ict",
      catalogue,
    );
    expect(found.map((c) => c.id)).toEqual(["ai-ce", "ai-ict"]);
    expect(found[0]).toMatchObject({ how: "code", alreadyHere: false, where: ["ce 5"] });
    expect(found[1]).toMatchObject({ how: "name", alreadyHere: true });
    expect(findCandidates({ name: "Thermodynamics", semester: 3 }, "ict", catalogue)).toEqual([]);
  });

  it("links an existing course, or suggests a new one keyed by its name", () => {
    const m = MissingSubjectSchema.parse({ name: "Intro to AI", semester: 3 });
    expect(missingSubjectChange(m, "ece", { id: "ai-ce", name: "AI" })).toMatchObject({
      type: "course missing from branch/semester",
      prism: { subject: "ai-ce" },
      to: { branch: "ece", semester: 3 },
    });
    const a = missingSubjectChange(m, "ece");
    const b = missingSubjectChange({ ...m, name: "Data Mining" }, "ece");
    expect(a.type).toBe("new course");
    expect(proposalId(a)).not.toBe(proposalId(b));
    expect(proposalId(a)).toBe(
      proposalId(missingSubjectChange({ ...m, name: "intro to  AI!" }, "ece")),
    );
  });
});

describe("lesson flags", () => {
  it("validates the flag and keys it per student and lesson version", () => {
    const f = LessonFlagSchema.parse({
      subject: "em",
      topic: "gauss",
      level: "school",
      durationMin: 15,
      type: "wrong-formula",
    });
    expect(f.version).toBe(1);
    expect(lessonFlagId(f, "u1")).toBe("em_gauss_school_15__v1__u1");
    expect(LessonFlagSchema.safeParse({ ...f, type: "spam" }).success).toBe(false);
  });
});
