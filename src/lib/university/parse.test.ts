import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseUniversitySyllabus, semesterOf } from "@/lib/university/parse";

const sample = readFileSync(
  path.join(process.cwd(), "test-fixtures", "university-syllabus-sample.txt"),
  "utf8",
);

describe("semesterOf", () => {
  it("reads roman, digit and word forms", () => {
    expect(semesterOf("Semester III")).toBe(3);
    expect(semesterOf("SEM-4")).toBe(4);
    expect(semesterOf("Semester - 2")).toBe(2);
    expect(semesterOf("Fifth Semester")).toBe(5);
  });
  it("ignores other lines", () => {
    expect(
      semesterOf("Semester exams are held in May and December every year for all students"),
    ).toBeNull();
    expect(semesterOf("Engineering Mathematics")).toBeNull();
    expect(semesterOf("Semester 9")).toBeNull();
  });
});

describe("parseUniversitySyllabus", () => {
  const out = parseUniversitySyllabus(sample);
  const by = (name: string) => out.subjects.find((s) => s.name.includes(name));

  it("finds every subject, with its code and semester", () => {
    expect(out.subjects.map((s) => s.name)).toEqual([
      "Engineering Biology",
      "Engineering Mathematics I",
      "Applied Physics",
      "Engineering Mechanics",
      "Indian Knowledge System",
    ]);
    expect(by("Engineering Biology")?.code).toBe("BT101");
    expect(by("Engineering Biology")?.semester).toBe(1);
    expect(by("Applied Physics")?.semester).toBe(1);
    expect(by("Engineering Mechanics")?.semester).toBe(2);
    expect(by("Indian Knowledge System")?.semester).toBe(2);
  });

  it("reads each subject's units and topics, and stops at the next subject", () => {
    const bio = by("Engineering Biology")!;
    expect(bio.units).toHaveLength(3);
    expect(bio.units[0].topics).toContain("Biomolecules");
    expect(bio.units[1].topics.join(" ")).toMatch(/DNA replication/);
    const maths = by("Engineering Mathematics")!;
    expect(maths.units).toHaveLength(3);
    expect(maths.units.flatMap((u) => u.topics).join(" ")).not.toMatch(/Quantum/);
  });

  it("does not turn text books or totals into subjects", () => {
    expect(out.subjects.some((s) => /text|total|credits/i.test(s.name))).toBe(false);
    expect(
      by("Indian Knowledge System")!
        .units.flatMap((u) => u.topics)
        .join(" "),
    ).not.toMatch(/Some Author/);
  });

  it("falls back to one subject when there are only units", () => {
    const only = parseUniversitySyllabus(
      "Unit 1: Waves - sound, light\nUnit 2: Heat - temperature, entropy",
    );
    expect(only.subjects).toHaveLength(1);
    expect(only.subjects[0].units).toHaveLength(2);
  });
  it("returns nothing for text with no syllabus in it", () => {
    expect(parseUniversitySyllabus("Hello there. Nothing to see.").subjects).toEqual([]);
  });
});
