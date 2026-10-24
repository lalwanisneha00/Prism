import { describe, expect, it } from "vitest";
import {
  bestCourse,
  covers,
  matchHandouts,
  type HandoutCourse,
  type MatchOptions,
  type PrismCourse,
} from "./handoutMatch";

const options: MatchOptions = { incomplete: () => false, branches: ["ict", "ce", "me"] };

function handout(over: Partial<HandoutCourse>): HandoutCourse {
  return {
    branch: "ict",
    sem: 3,
    code: null,
    title: "Digital Circuits",
    courseType: "theory",
    units: [],
    experiments: [],
    related: [],
    pages: "3",
    source: "ICT/sem3.pdf",
    ...over,
  };
}

function prism(over: Partial<PrismCourse>): PrismCourse {
  return { id: "x", name: "X", offerings: [], chapters: [], ...over };
}

const digital = prism({
  id: "pdeu-digital-circuits-ict",
  name: "Digital Circuits (ICT)",
  offerings: [{ branch: "ict", semester: 3 }],
  chapters: [
    {
      id: "number-systems",
      name: "Number Systems and Logic Gates",
      topics: [
        { id: "gray", name: "Gray codes" },
        { id: "excess", name: "Excess-3 codes, Logic Gates, and Truth Table" },
        { id: "flipflops", name: "JK flip-flop" },
      ],
    },
    {
      id: "sequential",
      name: "Sequential Circuits",
      topics: [{ id: "counters", name: "Ring counter" }],
    },
    { id: "old", name: "Old chapter", topics: [{ id: "gone", name: "Something removed" }] },
  ],
});

describe("covers", () => {
  it("treats differently split topics as the same", () => {
    expect(covers("Logic Gates", "Excess-3 codes, Logic Gates, and Truth Table")).toBe(true);
    expect(covers("Gray codes", "gray codes")).toBe(true);
    expect(covers("Hamming codes", "Gray codes")).toBe(false);
  });
});

describe("bestCourse", () => {
  it("matches by code first", () => {
    const p = prism({ id: "ai", name: "Something else", code: "24CS301T" });
    expect(
      bestCourse(handout({ code: "24CS301T", title: "Intro to AI" }), [p]).best?.course.id,
    ).toBe("ai");
  });

  it("never matches across numbers or a course with its lab", () => {
    const maths1 = prism({ id: "m1", name: "Mathematics I" });
    const lab = prism({ id: "lab", name: "Industry 4.0 Lab" });
    expect(bestCourse(handout({ title: "Mathematics – III" }), [maths1]).best).toBeNull();
    expect(bestCourse(handout({ title: "Industry 4.0" }), [lab]).best).toBeNull();
  });

  it("ignores bracketed notes and the 'Intoduction' typo", () => {
    const cp = prism({ id: "cp2", name: "Introduction to Computer Programming II" });
    expect(
      bestCourse(handout({ title: "Intoduction to Computer Programming II (For ME/CL/CH/BT)" }), [
        cp,
      ]).best?.course.id,
    ).toBe("cp2");
  });

  it("prefers the copy already in this branch", () => {
    const other = prism({
      id: "dc-ce",
      name: "Digital Circuits",
      offerings: [{ branch: "ce", semester: 3 }],
    });
    expect(bestCourse(handout({}), [other, digital]).best?.course.id).toBe(digital.id);
  });
});

describe("matchHandouts", () => {
  it("finds moved and missing topics, wrong order, and retires what no handout lists", () => {
    const h = handout({
      units: [
        { order: 1, name: "Sequential Circuits", topics: ["Ring counter", "JK flip-flop"] },
        {
          order: 2,
          name: "Number Systems and Logic Gates",
          topics: ["Gray codes", "Logic Gates", "Hamming codes"],
        },
      ],
    });
    const { changes } = matchHandouts([h], [digital], [], options);
    const types = changes.map((c) => c.type);
    expect(types).toContain("unit wrong order");
    expect(changes.find((c) => c.type === "topic under wrong unit")?.prism?.topic).toBe(
      "flipflops",
    );
    expect(changes.find((c) => c.type === "topic missing")?.handout?.topic).toBe("Hamming codes");
    expect(changes.find((c) => c.retire && c.prism?.chapter === "old")).toBeDefined();
    expect(types).not.toContain("course missing from branch/semester");
  });

  it("moves a course offered in the wrong semester", () => {
    const { changes } = matchHandouts([handout({ sem: 4 })], [digital], [], options);
    expect(changes[0]).toMatchObject({ type: "course in wrong semester", to: { semester: 4 } });
  });

  it("sends a same-named course of another branch with a different syllabus to review", () => {
    const ml = prism({
      id: "ml-ce",
      name: "Machine Learning",
      offerings: [{ branch: "ce", semester: 6 }],
      chapters: [{ id: "c", name: "Regression", topics: [{ id: "t", name: "Linear regression" }] }],
    });
    const h = handout({
      title: "Machine Learning",
      sem: 6,
      units: [
        {
          order: 1,
          name: "Kernels",
          topics: ["Support vector machines", "Kernel trick", "Margins"],
        },
      ],
    });
    // Only ICT handouts here, so CE's own course is left alone.
    const result = matchHandouts([h], [ml], [], { ...options, branches: ["ict"] });
    expect(result.changes).toEqual([]);
    expect(result.needsReview[0].reason).toBe("same name, different syllabus in another branch");
  });

  it("adds labs as practical courses and new courses when nothing matches", () => {
    const { changes } = matchHandouts(
      [
        handout({ title: "Digital Circuits Laboratory", courseType: "practical" }),
        handout({ title: "Quantum Widgets" }),
      ],
      [digital],
      [],
      options,
    );
    // (The theory course no handout matched is retired too.)
    expect(changes.map((c) => c.type).slice(0, 2)).toEqual(["new practical course", "new course"]);
  });

  it("suggests linking a course-table row with no handout page, and retires courses in no handout", () => {
    const ai = prism({
      id: "ai-biotech",
      name: "Introduction to Artificial Intelligence",
      offerings: [{ branch: "biotech", semester: 3 }],
    });
    const stray = prism({
      id: "stray",
      name: "Stray Course",
      offerings: [{ branch: "ict", semester: 5 }],
    });
    const result = matchHandouts(
      [],
      [ai, stray],
      [
        {
          branch: "ict",
          sem: 3,
          name: "Introduction to Artificial Intelligence (Department",
          fileSem: 3,
        },
      ],
      options,
    );
    expect(result.needsReview[0]).toMatchObject({
      reason: "in course table, no handout page",
      sem: 3,
    });
    expect(result.needsReview[0].detail).toContain("ai-biotech");
    expect(result.changes).toEqual([
      expect.objectContaining({
        type: "extra item not in any handout",
        retire: true,
        prism: { subject: "stray" },
      }),
    ]);
  });

  it("ignores a code printed on both a course and its lab", () => {
    const micro = prism({
      id: "micro",
      name: "General Microbiology",
      code: "24BT205T",
      offerings: [{ branch: "ict", semester: 3 }],
    });
    const { changes, matched } = matchHandouts(
      [
        handout({ code: "24BT205T", title: "General Microbiology" }),
        handout({ code: "24BT205T", title: "General Microbiology Lab", courseType: "practical" }),
      ],
      [micro],
      [],
      options,
    );
    expect(matched.map((m) => m.title)).toEqual(["General Microbiology"]);
    expect(changes.map((c) => c.type)).toEqual(["new practical course"]);
  });

  it("never retires where the handouts are incomplete", () => {
    const stray = prism({
      id: "stray",
      name: "Stray Course",
      offerings: [{ branch: "ict", semester: 1 }],
    });
    const result = matchHandouts([], [stray], [], { ...options, incomplete: (_b, s) => s === 1 });
    expect(result.changes).toEqual([]);
    expect(result.needsReview).toHaveLength(1);
  });
});
