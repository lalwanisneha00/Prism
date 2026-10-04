import { describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import type { Lesson } from "@/lib/schema";
import {
  dropUnsupportedCharts,
  numbersInText,
  sourcedNumberProblems,
  unsupportedSourcedNumbers,
} from "@/visuals/generic/sourcedNumbers";

function withChart(values: number[]): Lesson {
  const lesson = structuredClone(sampleLessons[0]);
  lesson.sections[0] = {
    ...lesson.sections[0],
    visual: {
      type: "chart",
      chart: "bar",
      xLabel: "Year",
      yLabel: "Forest cover (%)",
      categories: ["A", "B"],
      series: [{ name: "Cover", values }],
      data: "sourced",
      sourceId: "s1",
      caption: "Forest cover",
    },
  };
  return lesson;
}

describe("sourced chart numbers", () => {
  it("reads plain and scientific numbers", () => {
    expect(numbersInText("31% and 1.5 × 10^3 and 2e-3")).toEqual([31, 1500, 0.002]);
  });

  it("accepts numbers found in the cited excerpt", () => {
    const lesson = withChart([31, 4.06]);
    const excerpts = { s1: "About 31% of land is forest, covering 4.06 billion hectares." };
    expect(unsupportedSourcedNumbers(lesson, excerpts)).toEqual([]);
  });

  it("flags made-up numbers, asks for a fix, and drops the chart if it stays wrong", () => {
    const lesson = withChart([31, 26]);
    const excerpts = { s1: "About 31% of land is forest." };
    expect(unsupportedSourcedNumbers(lesson, excerpts)[0].numbers).toEqual([26]);
    expect(sourcedNumberProblems(lesson, excerpts)[0]).toContain("illustrative");
    expect(dropUnsupportedCharts(lesson, excerpts).sections[0].visual).toBeUndefined();
    expect(dropUnsupportedCharts(lesson, excerpts).sections).toHaveLength(lesson.sections.length);
  });

  it("leaves illustrative charts alone", () => {
    const lesson = withChart([26]);
    const v = lesson.sections[0].visual;
    if (v?.type === "chart") v.data = "illustrative";
    expect(unsupportedSourcedNumbers(lesson, {})).toEqual([]);
  });
});
