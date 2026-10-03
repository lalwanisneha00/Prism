import { describe, expect, it } from "vitest";
import emGolden from "./golden/em.json";
import mathGolden from "./golden/engg-math.json";
import {
  GoldenSchema,
  normalizeForMatch,
  overallPercent,
  scoreLesson,
  visualReport,
} from "./score";
import { sampleLessons } from "@/data/sampleLessons";
import { findChapter, findSubject, findTopic } from "@/lib/subjects";

const set = GoldenSchema.parse(emGolden);
const sets = [set, GoldenSchema.parse(mathGolden)];

describe("golden sets", () => {
  it("E&M has 40 topics and Engineering Maths at least 15 (SPEC §6.1 rule 5)", () => {
    expect(set.topics).toHaveLength(40);
    expect(sets[1].topics.length).toBeGreaterThanOrEqual(15);
    for (const s of sets)
      for (const t of s.topics) expect(t.facts.length, t.topic).toBeGreaterThanOrEqual(2);
  });

  it("only uses real topics in the right chapters, each once", () => {
    for (const s of sets) {
      const subject = findSubject(s.subject)!;
      expect(new Set(s.topics.map((t) => t.topic)).size).toBe(s.topics.length);
      for (const t of s.topics) {
        const chapter = findChapter(subject, t.chapter);
        expect(chapter && findTopic(chapter, t.topic), t.topic).toBeTruthy();
      }
    }
  });

  it("has patterns that compile", () => {
    for (const s of sets)
      for (const t of s.topics)
        for (const f of t.facts) expect(() => new RegExp(f.pattern, "i")).not.toThrow();
  });
});

describe("visual checks", () => {
  it("flags numbers on a 'sourced' chart that appear nowhere in the lesson or source", () => {
    const lesson = structuredClone(sampleLessons[0]);
    lesson.sections[0].visual = {
      type: "chart",
      chart: "bar",
      xLabel: "Material",
      yLabel: "Dielectric constant",
      categories: ["Glass", "Water"],
      series: [{ name: "κ", values: [4.7, 80] }],
      data: "sourced",
      sourceId: "src",
      caption: "Notice water's huge κ.",
    };
    const report = visualReport(lesson, [], { src: "Glass has κ ≈ 4.7." });
    expect(report.visuals).toBeGreaterThan(0);
    expect(report.unsupportedNumbers).toEqual([`${lesson.sections[0].id}: 80`]);
    expect(visualReport(lesson, [], { src: "Glass 4.7, water 80." }).unsupportedNumbers).toEqual(
      [],
    );
  });
});

describe("scoring", () => {
  it("finds every Gauss's law fact in the hand-checked sample lesson", () => {
    const gauss = set.topics.find((t) => t.topic === "gauss-law")!;
    expect(scoreLesson(sampleLessons[0], gauss)).toEqual({
      topic: "gauss-law",
      found: ["statement", "closed-surface", "outside-zero"],
      missing: [],
    });
  });

  it("does not credit facts a lesson never states", () => {
    const transformers = set.topics.find((t) => t.topic === "transformers")!;
    expect(scoreLesson(sampleLessons[0], transformers).found).not.toContain("step");
  });

  it("reads Unicode maths like LaTeX (ε₀A/d counts as epsilon_0 a/d)", () => {
    expect(normalizeForMatch("C = ε₀A/d, E = σ/(2ε₀), x² and π")).toBe(
      "c = epsilon_0a/d, e = sigma/(2epsilon_0), x^2 and pi",
    );
    const plate = set.topics.find((t) => t.topic === "parallel-plate-capacitor")!;
    const lesson = structuredClone(sampleLessons[0]);
    lesson.sections[0].body = "The capacitance is C = ε₀A/d and the field E = V/d is uniform.";
    expect(scoreLesson(lesson, plate).missing).toEqual([]);
  });

  it("reads LaTeX the way the patterns expect", () => {
    expect(normalizeForMatch(String.raw`\frac{Q_{\text{enc}}}{\varepsilon_0}`)).toBe(
      "fracq_encvarepsilon_0",
    );
  });

  it("computes an overall percentage", () => {
    expect(
      overallPercent([
        { topic: "a", found: ["x", "y"], missing: ["z"] },
        { topic: "b", found: ["x"], missing: [] },
      ]),
    ).toBe(75);
    expect(overallPercent([])).toBe(0);
  });
});
