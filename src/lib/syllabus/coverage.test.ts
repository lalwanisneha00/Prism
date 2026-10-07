import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { subjects } from "@/lib/subjects";
import {
  coverageFor,
  emphasisFor,
  missingFromPrism,
  NOTE_LATER,
  NOTE_OUTSIDE,
} from "@/lib/syllabus/coverage";
import { propose } from "@/lib/syllabus/propose";
import { buildSemester, idsOf, type Decision } from "@/lib/syllabus/store";
import { SyllabusByTermSchema } from "@/lib/syllabus/types";
import { parseUniversitySyllabus } from "@/lib/university/parse";

const pdeu = parseUniversitySyllabus(
  readFileSync(
    path.join(process.cwd(), "test-fixtures", "pdeu-computer-engineering-sem1-syllabus.txt"),
    "utf8",
  ),
);

// What the student would end up choosing on the review screen.
const decisions: Decision[] = pdeu.subjects.map((uni) => {
  const p = propose(uni, subjects);
  const pick = p.best ?? p.suggestion;
  return {
    uni,
    choice: pick
      ? {
          kind: "prism",
          subjectId: pick.subject.id,
          by: p.confidence === "high" ? "auto" : "confirmed",
        }
      : { kind: "own" },
  };
});
const term = buildSemester(1, decisions, subjects, { fileName: "pdeu.pdf", labs: pdeu.labs });
const syllabus = { "1": term };
// The PDEU catalogue has one subject per Mathematics course; this is the one Mathematics – I was matched to.
const MATHS = (
  decisions.find((d) => d.uni.name === "Mathematics – I")!.choice as { subjectId: string }
).subjectId;

describe("stored syllabus", () => {
  it("is valid against its schema, and old settings without it still load", () => {
    expect(SyllabusByTermSchema.safeParse(syllabus).success).toBe(true);
    expect(SyllabusByTermSchema.safeParse(undefined).success).toBe(false);
    expect(coverageFor("applied-physics", undefined)).toBeNull();
  });

  it("puts matched subjects on the list and keeps the rest as own subjects", () => {
    expect(idsOf(term)).toEqual(expect.arrayContaining(["applied-physics", MATHS]));
    const own = term.subjects.filter((s) => s.match.kind === "own").map((s) => s.name);
    expect(own).toContain("Universal Human Values");
  });
});

describe("coverage notes", () => {
  it("Applied Physics (whole subject): topics outside the syllabus stay, with the note", () => {
    const cov = coverageFor("applied-physics", syllabus)!;
    expect(cov.mode).toBe("whole");
    expect(cov.coveredCount).toBeGreaterThan(8);
    expect(cov.coveredCount).toBeLessThanOrEqual(cov.totalTopics);
    const inKey = [...cov.entries[0].covered][0];
    expect(cov.noteOf(inKey)).toBeNull();
    expect(cov.noteOf("applied-physics/not-a-covered-topic")).toBe(NOTE_OUTSIDE);
  });

  it("Mathematics I (split): uncovered topics say they may come later", () => {
    const cov = coverageFor(MATHS, syllabus)!;
    expect(cov.mode).toBe("split");
    expect(cov.noteOf(`${MATHS}/never-covered`)).toBe(NOTE_LATER);
    expect(cov.stateOf([...cov.entries[0].covered][0])).toMatchObject({ state: "in", semester: 1 });
  });

  it("a later semester fills up the coverage of the same subject", () => {
    const m1 = coverageFor(MATHS, syllabus)!;
    const em = subjects.find((s) => s.id === MATHS)!;
    const laterTopic = em.chapters
      .flatMap((c) => c.topics)
      .find((t) => !m1.entries[0].covered.has(`${MATHS}/${t.id}`))!;
    const sem2: typeof term = {
      ...term,
      semester: 2,
      subjects: [
        {
          ...term.subjects.find((s) => s.name === "Mathematics – I")!,
          name: "Mathematics – II",
          match: {
            kind: "prism",
            subjectId: MATHS,
            by: "confirmed",
            extra: [],
            covered: [`${MATHS}/${laterTopic.id}`],
          },
        },
      ],
    };
    const both = coverageFor(MATHS, { "1": term, "2": sem2 })!;
    expect(both.entries.map((e) => e.semester)).toEqual([1, 2]);
    expect(both.coveredCount).toBe(m1.coveredCount + 1);
    expect(both.stateOf(`${MATHS}/${laterTopic.id}`)).toMatchObject({
      state: "in",
      semester: 2,
      name: "Mathematics – II",
    });
  });

  it("lists syllabus topics Prism lacks, and gives outcomes only for covered topics", () => {
    const missing = missingFromPrism(syllabus, "applied-physics");
    // PDEU's own subject lists every topic of its syllabus, so nothing is missing from Prism.
    expect(missing.flatMap((m) => m.topics).length).toBeLessThan(6);
    const cov = coverageFor("applied-physics", syllabus)!;
    const key = [...cov.entries[0].covered][0];
    const e = emphasisFor(syllabus, "applied-physics", key)!;
    expect(e.outcomes).toHaveLength(6);
    expect(emphasisFor(syllabus, "applied-physics", "applied-physics/zzz")).toBeNull();
  });
});
