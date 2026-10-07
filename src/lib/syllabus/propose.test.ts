import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { subjects } from "@/lib/subjects";
import { coverageOf, isSequenced, propose } from "@/lib/syllabus/propose";
import { parseUniversitySyllabus } from "@/lib/university/parse";

const pdeu = parseUniversitySyllabus(
  readFileSync(
    path.join(process.cwd(), "test-fixtures", "pdeu-computer-engineering-sem1-syllabus.txt"),
    "utf8",
  ),
);
const uni = (name: string) => pdeu.subjects.find((s) => s.name === name)!;

describe("isSequenced", () => {
  it("spots subjects split over semesters", () => {
    for (const n of [
      "Mathematics – I",
      "Mathematics II",
      "Computer Programming-I",
      "Physics Part 2",
    ]) {
      expect(isSequenced(n), n).toBe(true);
    }
    for (const n of ["Applied Physics", "Environmental Science", "Universal Human Values"]) {
      expect(isSequenced(n), n).toBe(false);
    }
  });
});

describe("propose, on PDEU's real Computer Engineering semester 1", () => {
  it("uses a clear name match straight away (high confidence)", () => {
    const ap = propose(uni("Applied Physics"), subjects);
    expect(ap.best?.subject.id).toBe("applied-physics");
    expect(ap.confidence).toBe("high");
    const es = propose(uni("Environmental Science"), subjects);
    expect(es.best?.subject.id).toMatch(/^environment/);
  });

  it("asks about a subject that looks like a part of a bigger one (Mathematics I)", () => {
    const m = propose(uni("Mathematics – I"), subjects);
    expect(m.best?.subject.id).toMatch(/^(engg-math|mathematics-i)/);
    expect(m.confidence).toBe("confirm");
    expect(m.suggestion?.subject.id).toMatch(/^(engg-math|mathematics-i)/);
  });

  it("asks about a numbered subject even when the name matches (Computer Programming-I)", () => {
    const cp = propose(uni("Computer Programming-I"), subjects);
    expect((cp.best ?? cp.suggestion)?.subject.id).toMatch(
      /^(computer-programming|introduction-to-computer)/,
    );
    expect(cp.confidence).toBe("confirm");
  });

  it("leaves what Prism does not teach as the student's own (no guess)", () => {
    // Non-core courses are not subjects on Prism (they are studied from faculty material).
    for (const n of ["Universal Human Values"]) {
      const p = propose(uni(n), subjects);
      expect(p.best, n).toBeNull();
      expect(p.confidence, n).toBe("none");
      expect(p.suggestion, n).toBeNull();
    }
  });
});

describe("coverageOf", () => {
  it("finds the Prism topics the syllabus covers (PDEU's own subject covers all of it)", () => {
    const physics = subjects.find((s) => s.id === "applied-physics")!;
    const { covered, extra } = coverageOf(physics, uni("Applied Physics"));
    expect(covered.length).toBeGreaterThan(40);
    expect(covered.every((k) => k.startsWith("applied-physics/"))).toBe(true);
    expect(extra.length).toBeLessThan(10);
    expect(extra.every((x) => x.length <= 120)).toBe(true);
  });

  it("covers only part of the test-only Engineering Mathematics for Mathematics I", () => {
    const em = subjects.find((s) => s.id === "engg-math")!;
    const { covered } = coverageOf(em, uni("Mathematics – I"));
    const total = em.chapters.reduce((n, c) => n + c.topics.length, 0);
    expect(covered.length).toBeGreaterThan(5);
    expect(covered.length).toBeLessThan(total / 2);
  });
});
