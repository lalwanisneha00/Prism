import { describe, expect, it } from "vitest";
import {
  adjustPlan,
  estimateChapter,
  paperStats,
  planTopics,
  prerequisiteDepth,
  shareMinutes,
  sizeOf,
  splitPoint,
  type LoadInput,
} from "@/lib/chapter/estimate";
import { findSubject } from "@/lib/subjects";

const em = findSubject("em")!;
const electrostatics = em.chapters.find((c) => c.id === "electrostatics")!;
const allTopics = em.chapters.flatMap((c) => c.topics);
const base: LoadInput = { topics: electrostatics.topics, allTopics, level: "first-encounter" };

describe("chapter time options", () => {
  it("gives three options sized by the chapter, with Standard recommended", () => {
    const e = estimateChapter(base);
    expect(e.options.map((o) => o.label)).toEqual(["Quick", "Standard", "Thorough"]);
    expect(e.options.map((o) => o.minutes)).toEqual(
      { small: [20, 30, 45], medium: [30, 45, 60], large: [45, 60, 90] }[e.size],
    );
    expect(e.recommended).toBe("standard");
    // No papers, no syllabus hours: the note must say it is based on size only.
    expect(e.sizeOnly).toBe(true);
    expect(e.factors[0]).toBe(`${electrostatics.topics.length} topics`);
  });

  it("scales down for revision levels", () => {
    const first = estimateChapter(base).options.map((o) => o.minutes);
    const last = estimateChapter({ ...base, level: "last-minute" });
    expect(last.options.every((o, i) => o.minutes < first[i])).toBe(true);
    expect(last.recommended).toBe("quick");
  });

  it("splits a lesson longer than 90 minutes into two parts", () => {
    const e = estimateChapter({ ...base, level: "deep-dive", hours: 14 });
    const thorough = e.options.find((o) => o.name === "thorough")!;
    expect(thorough.minutes).toBeGreaterThan(90);
    expect(thorough.parts?.reduce((a, b) => a + b, 0)).toBe(thorough.minutes);
  });

  it("lists only the factors it really used", () => {
    const papers = { total: 5, withChapter: 4, marks: 23, topicHits: {} };
    const e = estimateChapter({
      ...base,
      hours: 8,
      papers,
      completed: new Set([electrostatics.topics[0].id]),
      weak: new Set([electrostatics.topics[1].id]),
    });
    expect(e.sizeOnly).toBe(false);
    expect(e.factors).toContain("8 syllabus hours");
    expect(e.factors).toContain("appears in 4 of your 5 uploaded papers (23 marks)");
    expect(e.factors).toContain("1 topic you've studied (short recap)");
    expect(e.factors).toContain("1 weak topic (more time)");
    expect(e.recommended).toBe("thorough");
  });

  it("maps the load score to a size", () => {
    expect([sizeOf(3), sizeOf(6), sizeOf(12)]).toEqual(["small", "medium", "large"]);
  });

  it("counts how much a topic builds on", () => {
    const deep = allTopics.find((t) => (t.requires?.length ?? 0) > 0)!;
    expect(prerequisiteDepth(deep.id, allTopics)).toBeGreaterThan(0);
    expect(prerequisiteDepth("no-such-topic", allTopics)).toBe(0);
  });
});

describe("previous-year papers", () => {
  it("finds the chapter's topics in papers and adds up their marks", () => {
    const papers = [
      "Q1. State and prove Gauss's law. (5 marks)\nQ2. Define magnetic flux. (2 marks)",
      "Q1. Derive the electric field of a dipole using Coulomb's law. (6 marks)",
      "Q1. Explain Faraday's law of induction. (5 marks)",
    ];
    const s = paperStats(papers, electrostatics.topics, em.chapters);
    expect(s.total).toBe(3);
    expect(s.withChapter).toBeGreaterThanOrEqual(1);
    expect(s.marks).toBeGreaterThanOrEqual(5);
  });
});

describe("sharing time across topics", () => {
  it("shares whole minutes by weight, never below the minimum, adding up exactly", () => {
    const m = shareMinutes([1, 2, 1, 0.2], 45);
    expect(m.reduce((a, b) => a + b, 0)).toBe(45);
    expect(Math.min(...m)).toBeGreaterThanOrEqual(3);
    expect(m[1]).toBeGreaterThan(m[0]);
  });

  it("gives completed topics a short recap and weak ones more time", () => {
    const [a, b, c] = electrostatics.topics;
    const plan = planTopics(
      { ...base, topics: [a, b, c], completed: new Set([a.id]), weak: new Set([c.id]) },
      30,
    );
    const by = Object.fromEntries(plan.map((p) => [p.id, p]));
    expect(by[a.id].recap).toBe(true);
    expect(by[a.id].minutes).toBeLessThan(by[c.id].minutes);
    expect(plan.reduce((s, p) => s + p.minutes, 0)).toBe(30);
  });

  it("keeps prerequisite order for learning levels, importance order for exam prep", () => {
    const learn = planTopics(base, 45).map((p) => p.id);
    for (const t of electrostatics.topics) {
      for (const r of t.requires ?? []) {
        if (learn.includes(r)) expect(learn.indexOf(r)).toBeLessThan(learn.indexOf(t.id));
      }
    }
    const exam = planTopics({ ...base, level: "exam-prep" }, 30);
    expect(exam[0].minutes).toBeGreaterThanOrEqual(exam[exam.length - 1].minutes);
  });

  it("keeps the total when a topic is changed or skipped", () => {
    const plan = planTopics(base, 45);
    const longer = adjustPlan(plan, plan[0].id, { minutes: plan[0].minutes + 6 }, 45);
    expect(longer[0].minutes).toBe(plan[0].minutes + 6);
    expect(longer.reduce((s, p) => s + p.minutes, 0)).toBe(45);
    const skipped = adjustPlan(longer, plan[1].id, { skipped: true }, 45);
    expect(skipped[1]).toMatchObject({ skipped: true, minutes: 0 });
    expect(skipped.reduce((s, p) => s + p.minutes, 0)).toBe(45);
  });

  it("splits at the topic boundary nearest to halfway", () => {
    const plan = [10, 20, 30, 40].map((minutes, i) => ({
      id: `t${i}`,
      name: `T${i}`,
      minutes,
      recap: false,
      skipped: false,
    }));
    expect(splitPoint(plan)).toBe(3);
  });
});
