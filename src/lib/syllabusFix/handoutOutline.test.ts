import { describe, expect, it } from "vitest";
import { parseOutline } from "./handoutOutline";

describe("parseOutline", () => {
  it("reads a multi-semester 'Course Outline' with glued semester cells", () => {
    const rows = parseOutline([
      "Course Outline",
      "Sem Course Name Th Tut Pra Hrs Cr",
      "HSC Humanities – 1 2 0 0 2 2",
      "BSC Mathematics – 1 3 1 0 4 4",
      "16 1 5 23 20",
      "HSC Humanities – 2 2 0 0 2 2",
      "13 1 12 26 20",
      "Pro Civic and Social Service Internship 0 0 0 0 1",
      "ESC",
      "Introduction to Artificial Intelligence (Department",
      "Specific)",
      "3 0 0 3 3",
      "SemPC Digital Circuits Laboratory 0 0 2 2 1",
      "IIIPC Data Structures and Algorithms 3 0 0 3 3",
      "16 1 4 21 20",
    ]);
    const sem3 = rows.filter((r) => r.sem === 3).map((r) => r.name);
    expect(sem3).toContain("Introduction to Artificial Intelligence (Department Specific)");
    expect(sem3).toContain("Data Structures and Algorithms");
    expect(rows.find((r) => r.name === "Mathematics – 1")?.sem).toBe(1);
    expect(rows.find((r) => r.name === "Humanities – 2")?.sem).toBe(2);
    expect(rows.find((r) => r.name === "Digital Circuits Laboratory")?.ltp).toEqual({
      L: 0,
      T: 0,
      P: 2,
    });
  });

  it("reads 'Semester III' tables with codes and exam marks", () => {
    const rows = parseOutline([
      "Semester III",
      "Course Code Course Name Theory Tutorial Practical Hrs Credits",
      "24MA201T Mathematics-III 3 1 0 4 4 25 25 50 -- -- 100",
      "24PE201T Introduction to Artificial Intelligence 3 0 0 3 3 25 25 50 -- -- 100",
      "Total 16 3 4 23 22",
      "Semester IV",
      "24PE206T Industry 4.0 2 0 0 2 2 25 25 50 -- -- 100",
    ]);
    expect(rows.map((r) => [r.sem, r.code, r.name])).toEqual([
      [3, "24MA201T", "Mathematics-III"],
      [3, "24PE201T", "Introduction to Artificial Intelligence"],
      [4, "24PE206T", "Industry 4.0"],
    ]);
  });
});
