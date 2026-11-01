import { describe, expect, it } from "vitest";
import {
  describeScope,
  interleaveByUnit,
  mockSubjectIds,
  scopeProblem,
  scopeTree,
  topicsInScope,
  unitsInScope,
} from "@/lib/mock/scope";
import { hiddenByFlags, parseMyFlags } from "@/lib/syllabusFix/myFlags";
import { findSubject, subjects } from "@/lib/subjects";

const subject = {
  id: "test-subject",
  chapters: [
    {
      id: "u1",
      name: "Electrostatics",
      topics: [
        { id: "a", name: "Coulomb" },
        { id: "b", name: "Gauss" },
      ],
    },
    {
      id: "u2",
      name: "Magnetism",
      topics: [
        { id: "c", name: "Biot-Savart" },
        { id: "d", name: "Ampere", status: "retired" as const },
      ],
    },
    { id: "u3", name: "Old unit", status: "retired" as const, topics: [{ id: "e", name: "Old" }] },
    {
      id: "u4",
      name: "Optics",
      topics: [
        { id: "f", name: "Lenses" },
        { id: "g", name: "Mirrors" },
      ],
    },
  ],
};

describe("the scope tree", () => {
  it("leaves out retired units and topics and numbers the units", () => {
    const tree = scopeTree(subject);
    expect(tree.units.map((u) => [u.number, u.id])).toEqual([
      [1, "u1"],
      [2, "u2"],
      [3, "u4"],
    ]);
    expect(tree.units[1].topics.map((t) => t.id)).toEqual(["c"]);
  });

  it("leaves out what the student flagged out of their syllabus", () => {
    const hidden = hiddenByFlags(
      parseMyFlags([
        { type: "topic-not-in-syllabus", subject: "test-subject", chapter: "u1", topic: "b" },
        { type: "chapter-wrong-course", subject: "test-subject", chapter: "u4" },
      ]),
      3,
    );
    const tree = scopeTree(subject, hidden);
    expect(tree.units.map((u) => u.id)).toEqual(["u1", "u2"]);
    expect(tree.units[0].topics.map((t) => t.id)).toEqual(["a"]);
  });

  it("returns the chosen topics for each level", () => {
    const tree = scopeTree(subject);
    expect(topicsInScope(tree, "subject", []).map((t) => t.id)).toEqual(["a", "b", "c", "f", "g"]);
    expect(topicsInScope(tree, "units", ["u4"]).map((t) => t.id)).toEqual(["f", "g"]);
    expect(topicsInScope(tree, "topics", ["g", "a", "zzz"]).map((t) => t.id)).toEqual(["a", "g"]);
    expect(
      unitsInScope(tree, topicsInScope(tree, "topics", ["g", "a"])).map((u) => u.number),
    ).toEqual([1, 3]);
  });

  it("describes and checks a scope", () => {
    const tree = scopeTree(subject);
    expect(describeScope(tree, "subject", [])).toBe("Whole subject");
    expect(describeScope(tree, "units", ["u1", "u4"])).toBe("Units 1, 3");
    expect(describeScope(tree, "topics", ["a", "b"])).toBe("2 topics from Unit 1");
    expect(scopeProblem(tree, "units", [])).toMatch(/at least one unit/);
    expect(scopeProblem(tree, "topics", ["d"])).toMatch(/no longer/);
    expect(scopeProblem(tree, "subject", [])).toBeNull();
  });

  it("interleaves topics across units so short papers don't only test Unit 1", () => {
    const tree = scopeTree(subject);
    const order = interleaveByUnit(topicsInScope(tree, "subject", [])).map((t) => t.id);
    expect(order.slice(0, 3)).toEqual(["a", "c", "f"]);
    expect(order).toHaveLength(5);
  });
});

describe("subjects on the Mock Tests page", () => {
  it("skips labs and courses the student flagged as another semester or not in their branch", () => {
    const hidden = hiddenByFlags(
      parseMyFlags([
        { type: "course-wrong-semester", subject: "x", semester: 5 },
        { type: "course-wrong-semester", subject: "y", semester: 3 },
        { type: "course-not-in-branch", subject: "z" },
      ]),
      3,
    );
    expect(mockSubjectIds(["x", "y", "z", "lab", "w"], hidden, (id) => id === "lab")).toEqual([
      "y",
      "w",
    ]);
  });

  it("builds a tree for a real PDEU subject", () => {
    const real = findSubject("pdeu-discrete-mathematics") ?? subjects[0];
    const tree = scopeTree(real);
    expect(tree.units.length).toBeGreaterThan(0);
    expect(tree.units.every((u) => u.topics.length > 0)).toBe(true);
  });
});

describe("the student's own flags", () => {
  it("keeps only well-formed saved flags", () => {
    expect(parseMyFlags([{ type: "x" }, null, { type: "t", subject: "s", at: 5 }, "bad"])).toEqual([
      { type: "t", subject: "s", at: 5 },
    ]);
    expect(parseMyFlags("nope")).toEqual([]);
  });
});
