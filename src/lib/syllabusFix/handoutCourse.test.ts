import { describe, expect, it } from "vitest";
import {
  baseCourseName,
  codeSuffixType,
  decideCourseType,
  parseExperiments,
  parseUnits,
  tidyCaps,
  type TypeInput,
} from "./handoutCourse";

describe("parseUnits", () => {
  it("reads units in order, joins wrapped lines and keeps hours", () => {
    const units = parseUnits([
      "COURSE OBJECTIVES",
      "Ø To learn digital logic.",
      "UNIT-1: NUMBER SYSTEMS AND LOGIC GATES 8 Hrs.",
      "Digital systems; positional number system; Methods of base",
      "conversions; complements",
      "UNIT-2: SEQUENTIAL CIRCUITS 14 Hrs.",
      "Latches and flip-flops; counters. Max. Hrs.: 42",
      "COURSE OUTCOMES",
      "CO1: Study the basics.",
    ]);
    expect(units.map((u) => [u.order, u.name, u.hours])).toEqual([
      [1, "Number Systems and Logic Gates", 8],
      [2, "Sequential Circuits", 14],
    ]);
    expect(units[0].topics).toContain("Methods of base conversions");
    expect(units[1].topics).toEqual(["Latches and flip-flops", "counters"]);
  });

  it("stops at a second block of units numbered from 1 again (tutorials)", () => {
    const units = parseUnits([
      "UNIT 1: Binary arithmetic 10 Hrs.",
      "codes, arithmetic",
      "UNIT 2: Boolean algebra 10 Hrs.",
      "theorems, K-maps",
      "UNIT 1: Case studies",
      "design examples",
    ]);
    expect(units).toHaveLength(2);
  });

  it("drops numbering, a leading 'and' and leftovers like 'Max <>' from topics", () => {
    const [unit] = parseUnits([
      "UNIT I: Cementing 5 Hrs.",
      "11 Introduction to Cementing, types, and issues, Max <>",
    ]);
    expect(unit.topics).toEqual(["Introduction to Cementing", "types", "issues"]);
  });

  it("reads 'Hours: 12' and title-cases names printed in capitals, keeping acronyms", () => {
    const [unit] = parseUnits([
      "Unit IV: FOURIER SERIES Hours: 12",
      "Fourier series of periodic functions",
    ]);
    expect([unit.order, unit.name, unit.hours]).toEqual([4, "Fourier Series", 12]);
    expect(tidyCaps("BJT AMPLIFIERS AND DC BIASING")).toBe("BJT Amplifiers and DC Biasing");
    expect(tidyCaps("LAWS OF GAS FLOW")).toBe("Laws of Gas Flow");
    expect(tidyCaps("Boolean Algebra")).toBe("Boolean Algebra");
  });

  it("returns nothing when there are no units", () => {
    expect(parseUnits(["COURSE OBJECTIVES", "To learn."])).toEqual([]);
  });
});

describe("parseExperiments", () => {
  it("reads numbered experiments and splits off the aim", () => {
    const list = parseExperiments([
      "LIST OF EXPERIMENTS",
      "1 Iodometry– To determine the strength of given copper sulphate solution by titrating against",
      "N/20 sodium thiosulphate solution",
      "2 Study of Hall Effect.",
      "COURSE OUTCOMES",
    ]);
    expect(list).toEqual([
      {
        number: 1,
        title: "Iodometry",
        aim: "To determine the strength of given copper sulphate solution by titrating against N/20 sodium thiosulphate solution",
      },
      { number: 2, title: "Study of Hall Effect." },
    ]);
  });

  it("reads 'Experiment N:' lines, bullets under group headings, and a '31.' typo", () => {
    expect(
      parseExperiments([
        "LIST OF EXPERIMENTS",
        "Experiment 1: Measurement of viscosity",
        "Experiment 2: Reynolds apparatus",
      ]).map((e) => e.title),
    ).toEqual(["Measurement of viscosity", "Reynolds apparatus"]);
    expect(
      parseExperiments([
        "LIST OF EXPERIMENTS:",
        "Arrays and structures:",
        " Implementation of searching.",
        "Linear Data structures:",
        " Implementation of Stack.",
      ]).map((e) => [e.number, e.title]),
    ).toEqual([
      [1, "Implementation of searching."],
      [2, "Implementation of Stack."],
    ]);
    expect(
      parseExperiments([
        "LIST OF EXPERIMENTS",
        "1 Pour plate",
        "2 Streak plate",
        "31. Glycerol stock",
      ]).map((e) => e.number),
    ).toEqual([1, 2, 3]);
  });

  it("returns nothing without an experiment list", () => {
    expect(parseExperiments(["UNIT 1: Something"])).toEqual([]);
  });
});

describe("decideCourseType", () => {
  const base: TypeInput = {
    code: null,
    title: "Course",
    ltp: null,
    unitCount: 0,
    experimentCount: 0,
    hasLabTwin: false,
  };

  it("theory: lectures only", () => {
    const d = decideCourseType({
      ...base,
      code: "24CS301T",
      ltp: { L: 3, T: 0, P: 0 },
      unitCount: 4,
    });
    expect(d.courseType).toBe("theory");
    expect(d.review).toBeUndefined();
  });

  it("practical: a lab by name, with a P code", () => {
    const d = decideCourseType({
      ...base,
      code: "24CS302P",
      title: "Computer Networks Laboratory",
      ltp: { L: 0, T: 0, P: 2 },
    });
    expect(d.courseType).toBe("practical");
    expect(d.review).toBeUndefined();
  });

  it("practical: 0-0-6 field work, and flags the T code that disagrees", () => {
    const d = decideCourseType({
      ...base,
      code: "24PE210T",
      title: "Earth Science and Hydrocarbon Exploration Field Work",
      ltp: { L: 0, T: 0, P: 6 },
    });
    expect(d.courseType).toBe("practical");
    expect(d.review).toContain("code 24PE210T says theory");
  });

  it("keeps theory when 0-0-P is a copy error (a separate lab exists), for review", () => {
    const d = decideCourseType({
      ...base,
      code: "24ME206T",
      title: "Fluid Mechanics",
      ltp: { L: 0, T: 0, P: 2 },
      hasLabTwin: true,
    });
    expect(d.courseType).toBe("theory");
    expect(d.review).toContain("separate lab");
  });

  it("practice: lectures plus practical hours in one course", () => {
    expect(
      decideCourseType({ ...base, title: "Surveying", ltp: { L: 3, T: 0, P: 2 } }).courseType,
    ).toBe("practice");
  });

  it("flags a lab whose scheme shows lectures (copied from the theory page)", () => {
    const d = decideCourseType({
      ...base,
      title: "Project Management Laboratory",
      ltp: { L: 3, T: 0, P: 2 },
    });
    expect(d.courseType).toBe("practical");
    expect(d.review).toContain("named a lab");
  });

  it("falls back on units or experiments when there is no scheme", () => {
    expect(decideCourseType({ ...base, unitCount: 4 }).courseType).toBe("theory");
    expect(decideCourseType({ ...base, experimentCount: 8 }).courseType).toBe("practical");
    expect(decideCourseType(base).courseType).toBeNull();
  });
});

describe("codeSuffixType and baseCourseName", () => {
  it("reads the T/P letter only when there is one", () => {
    expect(codeSuffixType("24CS301T")).toBe("theory");
    expect(codeSuffixType("24CS301P")).toBe("practical");
    expect(codeSuffixType("24BT301TP")).toBeNull();
    expect(codeSuffixType("24YOG101")).toBeNull();
    expect(codeSuffixType("UG_2_L(CE/ICT/EC/EE)")).toBe("practical");
    expect(codeSuffixType(null)).toBeNull();
  });

  it("pairs a course with its lab", () => {
    expect(baseCourseName("Fluid Mechanics Laboratory")).toBe(baseCourseName("Fluid Mechanics"));
    expect(baseCourseName("Physics Lab (For CS, ICT)")).toBe("physics");
  });
});
