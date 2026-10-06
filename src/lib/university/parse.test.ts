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

/*
 * The real thing: B.Tech Computer Engineering, semester 1, from Pandit Deendayal Energy University's
 * published syllabus (https://api.pdeu.ac.in/pdpu/resources/btech-ce-syllabus-2025.pdf), as Prism's
 * own PDF reader extracts it (pages separated by a form feed). Messy on purpose: titles split over
 * lines, a heading at the foot of its page, wrapped outcomes, hours on their own lines.
 */
describe("a real university syllabus (PDEU, Computer Engineering semester 1)", () => {
  const pdeu = parseUniversitySyllabus(
    readFileSync(
      path.join(process.cwd(), "test-fixtures", "pdeu-computer-engineering-sem1-syllabus.txt"),
      "utf8",
    ),
  );
  const by = (name: string) => pdeu.subjects.find((s) => s.name === name)!;

  it("finds the seven theory subjects of semester 1, with codes", () => {
    expect(pdeu.subjects.map((s) => [s.code, s.name])).toEqual([
      ["24HS101T", "English Communication"],
      ["24MA101T", "Mathematics – I"],
      ["24PH101T", "Applied Physics"],
      ["24CV101T", "Environmental Science"],
      ["24BT101T", "Biological Systems for Engineers"],
      ["24CP101T", "Computer Programming-I"],
      ["24HS102T", "Universal Human Values"],
    ]);
    for (const s of pdeu.subjects) expect(s.semester).toBe(1);
  });

  it("sets laboratory and practical courses apart instead of making them subjects", () => {
    expect(pdeu.labs).toEqual([
      "Applied Physics Laboratory",
      "Workshop Practice",
      "Computer Programming – I Laboratory",
    ]);
  });

  it("reads each subject's four units and their topics, not the objectives or books", () => {
    for (const s of pdeu.subjects) {
      expect(s.units, s.name).toHaveLength(4);
      for (const u of s.units) expect(u.topics.length, `${s.name}: ${u.name}`).toBeGreaterThan(0);
      const all = s.units.flatMap((u) => u.topics).join(" ");
      expect(all).not.toMatch(/Teaching Scheme|COURSE OBJECTIVES|Griffith|Kernighan|Hrs\./);
    }
    expect(by("Mathematics – I").units[0].name).toBe("Differential Calculus and Its Applications");
    expect(by("Applied Physics").units.flatMap((u) => u.topics)).toContain("Fermat’s principle");
    expect(by("Computer Programming-I").units[3].topics.join(" ")).toMatch(/File handling in C/);
  });

  it("reads all six course outcomes of every subject, word for word, even when they wrap", () => {
    for (const s of pdeu.subjects) expect(s.outcomes, s.name).toHaveLength(6);
    expect(by("Mathematics – I").outcomes[0]).toBe(
      "Identify the use of convergence of infinite series in engineering aspects.",
    );
    // Wrapped over two lines in the PDF.
    expect(by("English Communication").outcomes[1]).toBe(
      "Apply grammatical rules accurately in written and spoken communication to enhance clarity, coherence, and precision.",
    );
    // "CO2 -" with the text on the following lines.
    expect(by("Universal Human Values").outcomes[1]).toMatch(/^Appraise the meaning of happiness/);
    // "CO-1:" style.
    expect(by("Environmental Science").outcomes[0]).toMatch(
      /^Demonstrate comprehension of sustainable/,
    );
  });

  it("reads credits from the teaching-scheme table, wherever the heading sits", () => {
    expect(pdeu.subjects.map((s) => s.credits)).toEqual([2, 4, 3, 2, 2, 1, 1]);
  });

  it("flags nothing as unclear when everything was readable", () => {
    for (const s of pdeu.subjects) expect(s.unclear, s.name).toEqual([]);
  });

  it("flags what cannot be read instead of guessing", () => {
    const odd = parseUniversitySyllabus(
      "Semester I\nXY101 Mysterious Course\nSome text that has no units at all in it\n",
    );
    expect(odd.subjects[0].unclear).toContain("units");
    expect(odd.subjects[0].units).toEqual([]);
  });
});
