import { describe, expect, it } from "vitest";
import {
  copyAliases,
  isRealCode,
  mergeVerdict,
  pickMain,
  plainCourseName,
  topicOverlap,
  type CourseCopy,
} from "@/lib/syllabusFix/merge";

const topics = (names: string[]) =>
  names.map((n) => ({ id: n.toLowerCase().replace(/ /g, "-"), name: n }));

function copy(id: string, names: string[], extra: Partial<CourseCopy> = {}): CourseCopy {
  return {
    id,
    name: id,
    codes: [],
    nonCore: false,
    verified: true,
    offerings: 1,
    chapters: [{ id: "unit-1", name: "Unit 1", topics: topics(names) }],
    ...extra,
  };
}

const TEN =
  "Limits,Continuity,Rolle Theorem,Taylor Series,Jacobians,Maxima Minima,Double Integrals,Beta Gamma,Fourier Series,Laplace Transform".split(
    ",",
  );

describe("merging per-branch copies", () => {
  it("drops branch labels from a course name but keeps other brackets", () => {
    expect(plainCourseName("Indian Knowledge System (Petro)")).toBe("Indian Knowledge System");
    expect(plainCourseName("Mathematics - I (CE, ECE, Civil)")).toBe("Mathematics - I");
    expect(plainCourseName("Applied Physics Laboratory (For CS, ICT, ECE, EE)")).toBe(
      "Applied Physics Laboratory",
    );
    expect(plainCourseName("Open Elective 2 (NPTEL/SWAYAM/MOOC)")).toBe(
      "Open Elective 2 (NPTEL/SWAYAM/MOOC)",
    );
  });

  it("ignores placeholder codes", () => {
    expect(isRealCode("24HS103T")).toBe(true);
    expect(isRealCode("24ICxxxT")).toBe(false);
    expect(isRealCode("UG_1_T")).toBe(false);
    expect(isRealCode("24PH101T / 24PH102T")).toBe(false);
  });

  it("keeps the copy with the most topics as the main one", () => {
    const a = copy("a", TEN.slice(0, 8));
    const b = copy("b", TEN);
    expect(pickMain([a, b]).id).toBe("b");
  });

  it("measures overlap both ways, so a short copy cannot hide inside a long one", () => {
    expect(topicOverlap(copy("a", TEN), copy("b", TEN))).toBe(1);
    expect(topicOverlap(copy("a", TEN), copy("b", TEN.slice(0, 5)))).toBe(0.5);
  });

  it("merges the same non-core course, never two different ones", () => {
    const eng = copy("eng", ["Grammar"], { nonCore: true, codes: ["24HS101T"] });
    const engPetro = copy("eng-petro", ["Listening", "Speaking"], {
      nonCore: true,
      codes: ["24HS101T"],
    });
    const prof = copy("prof", ["Report Writing"], { nonCore: true, codes: ["24HS105T"] });
    expect(mergeVerdict(eng, engPetro, 1).merge).toBe(true);
    expect(mergeVerdict(eng, prof, 0.5).merge).toBe(false);
  });

  it("merges core copies at 80% overlap or with the same code, and lists the rest", () => {
    const main = copy("m", TEN);
    expect(mergeVerdict(main, copy("x", TEN.slice(0, 8)), 1)).toMatchObject({
      merge: true,
      why: "overlap",
    });
    const coded = { codes: ["24MA101T"] };
    expect(mergeVerdict({ ...main, ...coded }, copy("y", TEN.slice(0, 6), coded), 1)).toMatchObject(
      { merge: true, why: "same code" },
    );
    expect(mergeVerdict({ ...main, ...coded }, copy("z", TEN.slice(0, 2), coded), 1)).toMatchObject(
      { merge: false, why: "same code, different syllabus" },
    );
    expect(mergeVerdict(main, copy("w", TEN.slice(0, 7)), 1)).toMatchObject({
      merge: false,
      why: "below threshold",
    });
  });

  it("points a copy's topics at the main copy's, by id or by meaning", () => {
    const main = copy("m", ["Vedic Mathematics", "Indian Calendar System"]);
    const old = copy("o", ["Vedic Mathematics", "The Indian Calendar System", "Something Else"]);
    const a = copyAliases(old, main);
    expect(a.topics["vedic-mathematics"]).toBe("vedic-mathematics");
    expect(a.topics["the-indian-calendar-system"]).toBe("indian-calendar-system");
    expect(a.topics["something-else"]).toBeUndefined();
    expect(a.chapters["unit-1"]).toBe("unit-1");
  });
});
