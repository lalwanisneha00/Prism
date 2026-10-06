import { describe, expect, it } from "vitest";
import { emphasisRule, parseEmphasis } from "@/lib/syllabus/emphasis";

describe("course-outcome emphasis", () => {
  it("accepts a well-formed block and rejects junk", () => {
    expect(
      parseEmphasis({ subjectName: "Applied Physics", outcomes: ["Apply Gauss's law."] }),
    ).not.toBeNull();
    expect(parseEmphasis({ subjectName: "x", outcomes: [] })).toBeNull();
    expect(parseEmphasis({ subjectName: "x", outcomes: Array(9).fill("a") })).toBeNull();
    expect(parseEmphasis("<script>")).toBeNull();
    expect(parseEmphasis(undefined)).toBeNull();
  });

  it("adds the outcomes to the prompt, and nothing when there are none", () => {
    expect(emphasisRule(null)).toBe("");
    const rule = emphasisRule({
      subjectName: "Applied Physics",
      outcomes: ["Apply Gauss's law.", "Analyse waves."],
    });
    expect(rule).toContain("CO1: Apply Gauss's law.");
    expect(rule).toContain("CO2: Analyse waves.");
    expect(rule).toContain("Applied Physics");
  });
});
