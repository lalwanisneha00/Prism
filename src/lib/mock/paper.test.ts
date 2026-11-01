import { describe, expect, it } from "vitest";
import {
  assignTopics,
  checkSection,
  fakeSection,
  fitScheme,
  paperMarks,
  paperProblems,
  sectionPrompt,
  similarity,
  topicWeights,
  type CheckContext,
  type Paper,
  type PlannedSection,
} from "@/lib/mock/paper";
import { defaultPattern, scalePattern } from "@/lib/mock/pattern";
import { evaluateCheck } from "@/lib/safeMath";

const section: PlannedSection = {
  id: "s1",
  name: "Section A",
  slots: [
    { id: "s1q1", type: "mcq", marks: 1, topic: "gauss" },
    { id: "s1q2", type: "short", marks: 3, topic: "coulomb" },
    { id: "s1q3", type: "numerical", marks: 4, topic: "gauss" },
  ],
};
const ctx: CheckContext = {
  scope: new Set(["gauss", "coulomb"]),
  pyqs: ["State and explain Gauss's law of electrostatics with a neat diagram."],
  pyqRepeatMarks: 0,
  evaluate: evaluateCheck,
};
const good = () => fakeSection(section) as Record<string, unknown>[];

describe("assigning topics to slots", () => {
  it("gives every topic a question when there are enough slots", () => {
    const plan = assignTopics(scalePattern(defaultPattern("end-sem"), 50), ["a", "b", "c", "d"]);
    const used = new Set(plan.flatMap((s) => s.slots.map((q) => q.topic)));
    expect(used).toEqual(new Set(["a", "b", "c", "d"]));
  });

  it("never uses a topic outside the list", () => {
    const plan = assignTopics(scalePattern(defaultPattern("mid-sem"), 20), ["x"]);
    expect(plan.flatMap((s) => s.slots.map((q) => q.topic)).every((t) => t === "x")).toBe(true);
  });

  it("gives heavier topics (frequent in past papers) more marks", () => {
    const plan = assignTopics(
      scalePattern(defaultPattern("end-sem"), 100),
      ["a", "b"],
      new Map([["a", 4]]),
    );
    const marks = (t: string) =>
      plan
        .flatMap((s) => s.slots)
        .filter((q) => q.topic === t)
        .reduce((n, q) => n + q.marks, 0);
    expect(marks("a")).toBeGreaterThan(marks("b"));
  });

  it("counts how often topic names come up in past questions", () => {
    const w = topicWeights(
      [
        { id: "gauss", name: "Gauss's law" },
        { id: "biot", name: "Biot-Savart law" },
      ],
      ["State Gauss law.", "Apply Gauss law to a sphere.", "Define capacitance."],
    );
    expect(w.get("gauss")).toBe(3);
    expect(w.has("biot")).toBe(false);
  });
});

describe("checking the AI's questions", () => {
  it("accepts a correct section", () => {
    const r = checkSection(section, good(), ctx);
    expect(r.problems).toEqual([]);
    expect(r.ok.size).toBe(3);
  });

  it("rejects a question on a topic outside the chosen scope", () => {
    const raw = good();
    raw[1] = { ...raw[1], topic: "ampere" };
    const r = checkSection(section, raw, ctx);
    expect(r.problems).toEqual([{ slot: "s1q2", reason: expect.stringContaining("outside") }]);
    expect(r.ok.has("s1q2")).toBe(false);
  });

  it("fixes wrong marks to the slot's marks and rescales the scheme to add up", () => {
    const raw = good();
    raw[1] = {
      ...raw[1],
      marks: 5,
      scheme: [
        { point: "A", marks: 4 },
        { point: "B", marks: 1 },
      ],
    };
    const r = checkSection(section, raw, ctx);
    const q = r.ok.get("s1q2")!;
    expect(q.marks).toBe(3);
    expect(q.scheme.reduce((n, p) => n + p.marks, 0)).toBe(3);
    expect(r.fixed).toBeGreaterThan(0);
  });

  it("rejects an MCQ whose answer is not an option, and a wrong numerical", () => {
    const raw = good();
    raw[0] = { ...raw[0], answer: "Statement E" };
    raw[2] = { ...raw[2], check: { expression: "2*4", answer: 9 } };
    const reasons = checkSection(section, raw, ctx).problems.map((p) => p.slot);
    expect(reasons).toEqual(["s1q1", "s1q3"]);
  });

  it("reports a missing slot and an MCQ in a written slot", () => {
    const raw = good().slice(0, 2);
    raw[1] = { ...raw[0], slot: "s1q2", topic: "coulomb" };
    const r = checkSection(section, raw, ctx);
    expect(r.problems.map((p) => p.slot).sort()).toEqual(["s1q2", "s1q3"]);
  });

  it("rejects a copied past question unless labelled PYQ repeat within the share", () => {
    const copied = { ...good()[1], question: ctx.pyqs[0] };
    expect(checkSection(section, [good()[0], copied, good()[2]], ctx).problems[0]?.reason).toMatch(
      /copies/,
    );
    const repeat = { ...copied, source: "pyq-repeat" };
    const allowed = checkSection(section, [good()[0], repeat, good()[2]], {
      ...ctx,
      pyqRepeatMarks: 6,
    });
    expect(allowed.ok.get("s1q2")?.source).toBe("pyq-repeat");
    // Over the share: a real repeat is rejected (it may not be shown as new).
    const over = checkSection(section, [good()[0], repeat, good()[2]], {
      ...ctx,
      pyqRepeatMarks: 1,
    });
    expect(over.ok.has("s1q2")).toBe(false);
  });

  it("measures how alike two questions are", () => {
    expect(similarity("Derive Gauss law", "Derive Gauss law")).toBe(1);
    expect(similarity("Derive Gauss law", "Define capacitance")).toBe(0);
  });

  it("splits scheme marks to add up exactly, in halves", () => {
    const fitted = fitScheme(
      [
        { point: "a", marks: 1 },
        { point: "b", marks: 1 },
        { point: "c", marks: 1 },
      ],
      5,
    );
    expect(fitted.reduce((n, p) => n + p.marks, 0)).toBe(5);
    expect(fitted.every((p) => Number.isInteger(p.marks * 2))).toBe(true);
  });

  it("puts every slot and the topic list in the prompt", () => {
    const { prompt, system } = sectionPrompt({
      subjectName: "Physics",
      section,
      topics: [{ id: "gauss", name: "Gauss's law", unit: "Unit 1" }],
      facts: { gauss: ["Flux equals charge over epsilon"] },
      material: [],
      reference: [],
      pyqs: [],
      pyqRepeat: false,
      difficulty: "hard",
      styleNote: "Standard",
      avoid: [],
    });
    expect(prompt).toContain("s1q3: numerical, 4 marks, topic gauss");
    expect(prompt).toContain("[gauss] Flux");
    expect(system).toMatch(/Hard/);
    expect(system).toMatch(/Never copy a past question/);
  });
});

describe("the final paper check", () => {
  const paperOf = (marks: number[], attempt?: number): Paper => ({
    title: "T",
    subject: "s",
    totalMarks: 10,
    minutes: 20,
    sections: [
      {
        id: "s1",
        name: "A",
        ...(attempt ? { attempt } : {}),
        questions: marks.map((m, i) => ({
          id: `q${i}`,
          type: "short" as const,
          topic: "gauss",
          marks: m,
          question: "Q?",
          answer: "A",
          scheme: [{ point: "p", marks: m }],
          source: "lesson" as const,
        })),
      },
    ],
  });

  it("passes when the marks add up exactly and the topics are in scope", () => {
    expect(paperProblems(paperOf([5, 5]), new Set(["gauss"]), 10)).toEqual([]);
    expect(paperMarks(paperOf([5, 5, 5], 2))).toBe(10);
  });

  it("fails when the marks don't add up, a topic is outside, or choice marks differ", () => {
    expect(paperProblems(paperOf([5, 4]), new Set(["gauss"]), 10)[0]).toMatch(/add up to 9/);
    expect(paperProblems(paperOf([5, 5]), new Set(["other"]), 10)[0]).toMatch(/not chosen/);
    expect(paperProblems(paperOf([5, 6, 5], 2), new Set(["gauss"]), 11).join()).toMatch(
      /equal marks/,
    );
  });
});
