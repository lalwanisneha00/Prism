import { describe, expect, it } from "vitest";
import { pagesToLines, sliceCourses } from "./handoutText";
import {
  handoutWanted,
  isEmptyHandout,
  readStudentHandout,
  StudentHandoutSchema,
  textToPages,
  titleOverlap,
} from "./studentHandout";

/** Two handouts stacked in one file, the second starting mid-page (like PDEU's semester PDFs). */
const stacked: string[][] = [
  [
    "Pandit Deendayal Energy University",
    "24IC204T Introduction to Artificial Intelligence",
    "Teaching Scheme Examination Scheme",
    "3 0 0 3 3 25 50 25 - - 100",
    "UNIT 1: Introduction to AI 10 Hrs.",
    "AI problems; intelligent agents; problem formulation",
    "UNIT 2: Searching 12 Hrs.",
    "Uninformed search; heuristic search; game playing",
    "COURSE OUTCOMES",
    "CO1: Understand AI.",
  ],
  [
    "24IC205T Computer Networks",
    "Teaching Scheme Examination Scheme",
    "3 0 0 3 3 25 50 25 - - 100",
    "UNIT 1: Network models 10 Hrs.",
    "OSI model; TCP/IP model",
    "COURSE OUTCOMES",
  ],
];

describe("sliceCourses", () => {
  it("cuts stacked handouts into one slice per course", () => {
    const slices = sliceCourses(stacked);
    expect(slices.map((s) => [s.code, s.title])).toEqual([
      ["24IC204T", "Introduction to Artificial Intelligence"],
      ["24IC205T", "Computer Networks"],
    ]);
    expect(slices[0].lines.join(" ")).not.toContain("OSI model");
  });

  it("treats text without a scheme table as one untitled course", () => {
    const slices = sliceCourses(textToPages("Unit 1: Sets\nsets; relations"));
    expect(slices).toHaveLength(1);
    expect(slices[0].title).toBe("");
  });
});

describe("pagesToLines", () => {
  it("rebuilds lines top to bottom, left to right", () => {
    const lines = pagesToLines([
      [
        { x: 200, y: 700, str: "Topics" },
        { x: 50, y: 701, str: "Unit 1: " },
        { x: 50, y: 680, str: "Second line" },
      ],
    ]);
    expect(lines).toEqual([["Unit 1: Topics", "Second line"]]);
  });
});

describe("readStudentHandout", () => {
  it("finds the course by its code and reads its units", () => {
    const r = readStudentHandout(stacked, { name: "Something else", codes: ["24IC204T"] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.handout.units.map((u) => u.name)).toEqual(["Introduction to AI", "Searching"]);
    expect(r.handout.units[0].topics).toContain("intelligent agents");
    expect(r.handout.courseType).toBe("theory");
    expect(r.notes[0]).toMatch(/2 courses/);
  });

  it("falls back to the closest title", () => {
    const r = readStudentHandout(stacked, { name: "Computer Networks", codes: [] });
    expect(r.ok && r.handout.code).toBe("24IC205T");
  });

  it("lists the file's courses when this one is not in it", () => {
    const r = readStudentHandout(stacked, { name: "Thermodynamics", codes: ["24ME201T"] });
    expect(r).toEqual({
      ok: false,
      reason: "not-found",
      courses: ["Introduction to Artificial Intelligence", "Computer Networks"],
    });
  });

  it("says empty when the course has no units or experiments", () => {
    const r = readStudentHandout(textToPages("Some notes without structure"), {
      name: "AI",
      codes: [],
    });
    expect(r).toEqual({ ok: false, reason: "empty" });
  });

  it("reads a lab's experiments", () => {
    const r = readStudentHandout(
      textToPages(
        "List of Experiments\n1. To verify Ohm's law\n2. To find the focal length of a lens\nCourse Outcomes",
      ),
      { name: "Physics Lab", codes: [] },
    );
    expect(r.ok && r.handout.courseType).toBe("practical");
    expect(r.ok && r.handout.experiments).toHaveLength(2);
  });
});

describe("handoutWanted", () => {
  it("asks while a course is not verified", () => {
    expect(handoutWanted("unverified", undefined, undefined)).toBe(true);
    expect(handoutWanted("pending", undefined, 2024)).toBe(true);
  });
  it("asks a verified course only from students of another batch", () => {
    expect(handoutWanted("verified", undefined, 2024)).toBe(false);
    expect(handoutWanted("verified", [2024], 2024)).toBe(false);
    expect(handoutWanted("verified", [2024], 2023)).toBe(true);
    expect(handoutWanted("verified", [2024], undefined)).toBe(false);
  });
});

describe("StudentHandoutSchema", () => {
  const base = { code: null, title: "AI", courseType: "theory" as const, experiments: [] };
  it("accepts a normal handout and rejects oversize ones", () => {
    const unit = { order: 1, name: "Unit", topics: ["a"] };
    expect(StudentHandoutSchema.safeParse({ ...base, units: [unit] }).success).toBe(true);
    expect(
      StudentHandoutSchema.safeParse({ ...base, units: Array.from({ length: 21 }, () => unit) })
        .success,
    ).toBe(false);
    expect(
      StudentHandoutSchema.safeParse({ ...base, units: [{ ...unit, name: "x".repeat(301) }] })
        .success,
    ).toBe(false);
  });
  it("knows an empty handout", () => {
    expect(isEmptyHandout({ ...base, units: [{ order: 1, name: "U", topics: [] }] })).toBe(true);
  });
});

describe("titleOverlap", () => {
  it("ignores lab words and small words", () => {
    expect(titleOverlap("Physics Laboratory", "Physics")).toBe(1);
    expect(titleOverlap("Fluid Mechanics", "Engineering Mechanics")).toBe(0.5);
  });
});
