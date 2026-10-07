import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { subjects } from "@/lib/subjects";
import { planApply, type ReviewEntry } from "@/lib/university/apply";
import { matchSubject } from "@/lib/university/match";
import { parseUniversitySyllabus } from "@/lib/university/parse";

const uni = parseUniversitySyllabus(
  readFileSync(path.join(process.cwd(), "test-fixtures", "university-syllabus-sample.txt"), "utf8"),
);

/** The default review: take each best match, everything else as the student's own subject. */
function defaultReview(): ReviewEntry[] {
  return uni.subjects.map((u) => {
    const m = matchSubject(u, subjects);
    return {
      uni: u,
      semester: u.semester,
      choice: m.best ? { kind: "built-in", subjectId: m.best.subject.id } : { kind: "own" },
    } as ReviewEntry;
  });
}

describe("planApply", () => {
  it("puts each subject in the semester the university teaches it", () => {
    const plan = planApply(defaultReview(), subjects);
    expect(plan.picks["1"]).toEqual(expect.arrayContaining(["applied-physics"]));
    expect(plan.picks["2"]).toEqual(expect.arrayContaining(["engg-mechanics"]));
    expect(plan.own.map((o) => o.uni.name)).toEqual(
      expect.arrayContaining(["Engineering Biology", "Indian Knowledge System"]),
    );
    expect(plan.own.find((o) => o.uni.name === "Indian Knowledge System")?.semester).toBe(2);
  });

  it("scopes a built-in subject to what the university teaches", () => {
    const plan = planApply(defaultReview(), subjects);
    const physics = subjects.find((s) => s.id === "applied-physics")!;
    const scope = plan.scopes["applied-physics"];
    expect(scope).toBeDefined();
    expect(Object.keys(scope).length).toBeLessThan(physics.chapters.length);
  });

  it("honours chapters the student unticks, and skipped subjects", () => {
    const review = defaultReview();
    const phys = review.find((r) => r.uni.name === "Applied Physics")!;
    const physics = subjects.find((s) => s.id === "applied-physics")!;
    phys.hiddenChapters = [physics.chapters[0].id];
    const mech = review.find((r) => r.uni.name === "Engineering Mechanics")!;
    mech.choice = { kind: "skip" };
    const plan = planApply(review, subjects);
    expect(plan.scopes["applied-physics"][physics.chapters[0].id]).toBeUndefined();
    expect(plan.picks["2"] ?? []).not.toContain("engg-mechanics");
  });

  it("is empty for an empty review", () => {
    expect(planApply([], subjects)).toEqual({ picks: {}, scopes: {}, own: [] });
  });
});
