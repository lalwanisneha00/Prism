import { describe, expect, it } from "vitest";
import { sampleLessons } from "@/data/sampleLessons";
import { buildPlan, fitLength, LENGTH_SLACK } from "@/lib/slides/build";
import { planProblems, PURPOSES, SlidePlanSchema, type Purpose } from "@/lib/slides/plan";

const lesson = sampleLessons[0];
const opts = (purpose: Purpose, targetSlides: number) => ({
  purpose,
  targetSlides,
  subjectName: "Electricity & Magnetism",
  levelName: "First Encounter",
  title: lesson.meta.title,
});

describe("buildPlan", () => {
  for (const purpose of PURPOSES) {
    it(`makes a valid plan for ${purpose}`, () => {
      const plan = buildPlan([lesson], opts(purpose, 15));
      expect(SlidePlanSchema.safeParse(plan).success).toBe(true);
      expect(planProblems(plan)).toEqual([]);
      expect(plan.slides.at(-1)?.layout === "sources" || purpose === "summary").toBe(true);
      // No slide is empty and no list is long.
      for (const s of plan.slides) {
        if ("points" in s) expect(s.points.length).toBeLessThanOrEqual(5);
      }
    });
  }

  it("teaching decks have speaker notes with timing, an activity and a recap", () => {
    const plan = buildPlan([lesson], opts("teach", 15));
    const layouts = plan.slides.map((s) => s.layout);
    expect(layouts).toContain("activity");
    expect(layouts).toContain("recap");
    for (const s of plan.slides.filter((x) => x.layout !== "sources")) {
      expect(s.notes.length).toBeGreaterThan(20);
    }
    expect(plan.slides.some((s) => /About \d+ min/.test(s.notes))).toBe(true);
  });

  it("stays within 6 slides of the asked-for length", () => {
    for (const target of [8, 10, 15, 20, 30]) {
      const n = buildPlan([lesson], opts("study", target)).slides.length;
      expect(n).toBeLessThanOrEqual(target + LENGTH_SLACK);
    }
    // When the lesson has enough to say, a short ask gives a short deck.
    expect(buildPlan([lesson], opts("study", 8)).slides.length).toBeLessThanOrEqual(10);
  });

  it("varies layouts rather than repeating one", () => {
    const layouts = new Set(buildPlan([lesson], opts("teach", 20)).slides.map((s) => s.layout));
    expect(layouts.size).toBeGreaterThanOrEqual(6);
  });

  it("shows answers on study and revision quiz slides but not in a teaching deck", () => {
    const quiz = (p: Purpose) =>
      buildPlan([lesson], opts(p, 30)).slides.filter((s) => s.layout === "quiz");
    for (const s of quiz("study")) expect(s.layout === "quiz" && s.showAnswer).toBe(true);
    for (const s of quiz("teach")) expect(s.layout === "quiz" && s.showAnswer).toBe(false);
  });

  it("practice sheets put every answer after the questions", () => {
    const layouts = buildPlan([lesson], opts("practice", 10)).slides.map((s) => s.layout);
    expect(layouts.lastIndexOf("questions")).toBeLessThan(layouts.indexOf("answers"));
  });

  it("a one-page summary is a single content slide", () => {
    const plan = buildPlan([lesson], opts("summary", 1));
    expect(plan.slides).toHaveLength(1);
    expect(plan.slides[0].layout).toBe("summary");
  });

  it("joins several topics with section openers and one sources slide", () => {
    const second = { ...lesson, meta: { ...lesson.meta, title: "Gauss's law, again" } };
    const plan = buildPlan([lesson, second], opts("teach", 40));
    expect(plan.slides.filter((s) => s.layout === "section")).toHaveLength(2);
    expect(plan.slides.filter((s) => s.layout === "sources")).toHaveLength(1);
    expect(plan.topics).toHaveLength(2);
  });
});

describe("deck quality", () => {
  const strings = (v: unknown): string[] =>
    typeof v === "string"
      ? [v]
      : Array.isArray(v)
        ? v.flatMap(strings)
        : v && typeof v === "object"
          ? Object.values(v).flatMap(strings)
          : [];

  it("never leaves a line cut off with an ellipsis", () => {
    for (const purpose of PURPOSES) {
      const plan = buildPlan([lesson], opts(purpose, 30));
      for (const text of plan.slides.flatMap((s) => strings(s))) {
        // An ellipsis is fine only when the lesson itself wrote it (an open-ended question).
        if (text.endsWith("…") || text.endsWith("...")) {
          expect(JSON.stringify(lesson), text).toContain(text.slice(-24));
        }
      }
    }
  });

  it("class activities ask for thinking and take a sensible time", () => {
    const plan = buildPlan([lesson], opts("teach", 20));
    const acts = plan.slides.filter((s) => s.layout === "activity");
    expect(acts.length).toBeGreaterThanOrEqual(1);
    for (const a of acts) {
      if (a.layout !== "activity") continue;
      expect(a.minutes).toBeGreaterThanOrEqual(4);
      expect(a.minutes).toBeLessThanOrEqual(10);
      expect(a.hints.length).toBeGreaterThanOrEqual(2);
      expect(a.prompt.length).toBeGreaterThan(40);
    }
  });

  it("covers the lesson's whole explanation, with an agenda and key terms when the lesson has them", () => {
    const plan = buildPlan([lesson], opts("study", 40));
    const layouts = plan.slides.map((s) => s.layout);
    expect(layouts).toContain("example");
    expect(
      plan.slides.some((s) => s.layout === "bullets" && s.title === "What we will cover"),
    ).toBe(true);
    // Every section of the lesson appears on some slide.
    const text = JSON.stringify(plan.slides);
    for (const s of lesson.sections) expect(text).toContain(s.title.slice(0, 20));
  });
});

describe("fitLength", () => {
  it("never drops a required slide", () => {
    const c = Array.from({ length: 30 }, (_, i) => ({
      slide: { id: `s${i}` } as never,
      priority: i % 5,
      required: i % 10 === 0,
    }));
    const kept = fitLength(c, 10);
    expect(kept.length).toBeLessThanOrEqual(12);
    for (const k of c.filter((x) => x.required)) expect(kept).toContain(k);
  });
});
