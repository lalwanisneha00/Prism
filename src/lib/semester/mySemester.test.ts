import { describe, expect, it } from "vitest";
import { NON_CORE, picksFor, usuallyInSemester, withPick } from "@/lib/semester/mySemester";
import { allSubjects as subjects } from "@/lib/subjects";

describe("my subjects by semester", () => {
  it("adds and removes a subject for one semester only, without duplicates", () => {
    let p = withPick(undefined, 1, "engineering-biology", true);
    p = withPick(p, 1, "engineering-biology", true);
    p = withPick(p, 2, "applied-physics", true);
    expect(picksFor(p, 1)).toEqual(["engineering-biology"]);
    expect(picksFor(p, 2)).toEqual(["applied-physics"]);
    p = withPick(p, 1, "engineering-biology", false);
    expect(picksFor(p, 1)).toEqual([]);
    expect(picksFor(p, 2)).toEqual(["applied-physics"]);
  });
  it("lets different colleges put the same subject in different semesters", () => {
    const a = withPick(undefined, 1, "x", true);
    const b = withPick(undefined, 2, "x", true);
    expect(picksFor(a, 1)).toEqual(["x"]);
    expect(picksFor(b, 1)).toEqual([]);
  });
  it("suggests by semester but never limits the choice", () => {
    const s1 = usuallyInSemester(subjects, 1);
    expect(s1.length).toBeGreaterThan(0);
    expect(s1.every((s) => s.semesters.includes(1))).toBe(true);
    expect(usuallyInSemester(subjects, undefined)).toEqual([]);
  });
  it("points built-in non-core subjects at real catalogue entries", () => {
    for (const n of NON_CORE) {
      if (n.builtInId) expect(subjects.some((s) => s.id === n.builtInId)).toBe(true);
    }
    expect(NON_CORE.map((n) => n.name)).toContain("Indian Knowledge System");
  });
});
