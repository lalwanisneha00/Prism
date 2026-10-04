import { describe, expect, it } from "vitest";
import { levels } from "@/data/levels";
import { inferSkills } from "@/data/skills";
import {
  dependentCounts,
  rollUpImportance,
  topicImportance,
  whyImportance,
} from "@/lib/priority/importance";
import { difficultyOf, recommendLength, prerequisiteDepth } from "@/lib/priority/length";
import { predictTough, type TopicNode } from "@/lib/priority/predict";
import { minutesInRange, topicPriority } from "@/lib/priority/priority";
import { mistakeProfile, weakness, type LearningSignal } from "@/lib/priority/weakness";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 5);

describe("topic importance", () => {
  it("is Medium and 'not known yet' when there is no evidence", () => {
    const i = topicImportance({});
    expect(i.band).toBe("medium");
    expect(i.known).toBe(false);
    expect(whyImportance(i)).toMatch(/not known yet/i);
    expect(whyImportance(i)).toMatch(/previous-year papers/i);
  });

  it("is High for a topic in most papers that many later topics build on", () => {
    const i = topicImportance({
      papers: { inPapers: 4, totalPapers: 5 },
      dependents: { count: 6, max: 6 },
    });
    expect(i.band).toBe("high");
    expect(whyImportance(i)).toBe(
      "High return: appeared in 4 of your 5 papers · 6 later topics build on it",
    );
  });

  it("can be Low only from real evidence (absent from the papers, a small unit)", () => {
    const i = topicImportance({
      papers: { inPapers: 0, totalPapers: 5 },
      unit: { hours: 2, totalHours: 40, units: 5 },
    });
    expect(i.band).toBe("low");
    // Structure alone (nothing builds on it) never makes a topic Low.
    expect(topicImportance({ dependents: { count: 0, max: 5 } }).known).toBe(false);
  });

  it("treats an equal share of the syllabus as Medium", () => {
    expect(topicImportance({ unit: { hours: 8, totalHours: 40, units: 5 } }).band).toBe("medium");
  });

  it("lets the student's own choice win, shown as 'set by you'", () => {
    const i = topicImportance({ papers: { inPapers: 0, totalPapers: 5 }, override: "high" });
    expect(i.band).toBe("high");
    expect(i.setByYou).toBe(true);
    expect(i.reasons[0]).toBe("set by you");
  });

  it("rolls up to a chapter, and counts later topics that build on each one", () => {
    const high = topicImportance({ papers: { inPapers: 5, totalPapers: 5 } });
    const unknown = topicImportance({});
    const chapter = rollUpImportance([high, unknown]);
    expect(chapter.known).toBe(true);
    expect(chapter.reasons.join(" ")).toMatch(/1 not known yet/);
    expect(rollUpImportance([unknown]).known).toBe(false);
    expect(rollUpImportance([unknown], "low").setByYou).toBe(true);
    const counts = dependentCounts([
      { id: "a" },
      { id: "b", requires: ["a"] },
      { id: "c", requires: ["b"] },
    ]);
    expect(counts.get("a")).toBe(2);
    expect(counts.get("c")).toBe(0);
  });
});

describe("weak topics", () => {
  const quiz = (daysAgo: number, score: number, total = 5): LearningSignal => ({
    kind: "quiz",
    at: NOW - daysAgo * DAY,
    score,
    total,
  });

  it("is weak after a poor quiz and recent results count more than old ones", () => {
    expect(weakness([quiz(1, 1)], NOW).weak).toBe(true);
    // A good recent quiz outweighs a bad old one.
    const w = weakness([quiz(60, 0), quiz(1, 4)], NOW);
    expect(w.weak).toBe(false);
  });

  it("stops being weak once the student does well", () => {
    const signals: LearningSignal[] = [
      quiz(5, 1),
      quiz(4, 1),
      { kind: "confused", at: NOW - 3 * DAY },
    ];
    expect(weakness(signals, NOW).weak).toBe(true);
    expect(weakness([...signals, quiz(0, 5)], NOW).weak).toBe(false);
  });

  it("never marks a topic weak from a single tap", () => {
    expect(weakness([{ kind: "confused", at: NOW }], NOW).weak).toBe(false);
    const several: LearningSignal[] = [
      { kind: "confused", at: NOW },
      { kind: "confused", at: NOW },
      { kind: "abandoned", at: NOW },
      { kind: "simpler", at: NOW },
      { kind: "simpler", at: NOW },
    ];
    expect(weakness(several, NOW).weak).toBe(true);
  });

  it("spots the kind of mistake the student usually makes", () => {
    const wrong = (type: "numerical" | "conceptual", q: string): LearningSignal => ({
      kind: "wrong",
      at: NOW,
      question: q,
      type,
    });
    const mostlyNumerical = [
      wrong("numerical", "a"),
      wrong("numerical", "b"),
      wrong("numerical", "c"),
      wrong("conceptual", "d"),
    ];
    expect(mistakeProfile(mostlyNumerical, 4, 0.7)).toBe("numerical");
    expect(mistakeProfile(mostlyNumerical.slice(0, 2), 4, 0.7)).toBeUndefined();
  });
});

describe("predicted tough topics", () => {
  const node = (
    subject: string,
    id: string,
    name: string,
    requires: string[],
    skills: string[] = [],
  ): TopicNode => ({
    key: `${subject}/${id}`,
    subject,
    topicId: id,
    name,
    requires,
    skills,
    numericalHeavy: false,
  });
  const topics = [
    node("em", "gauss-law", "Gauss's Law", [], ["vector-calculus"]),
    node("em", "gauss-applications", "Applications of Gauss's Law", ["gauss-law"]),
    node("em", "capacitance", "Capacitance", ["gauss-applications"]),
    node("engg-math", "divergence", "Divergence theorem", [], ["vector-calculus"]),
    node("em", "ohms-law", "Ohm's law", []),
  ];
  const weakGauss = (questions: number) =>
    new Map([
      ["em/gauss-law", { score: 0.6, weak: true, questions, latestAccuracy: 0.4, reasons: [] }],
    ]);

  it("needs enough evidence: never from one wrong answer", () => {
    expect(predictTough({ topics, weak: weakGauss(1) })).toEqual([]);
  });

  it("predicts topics that build on, or share a skill with, a weak topic", () => {
    const p = predictTough({ topics, weak: weakGauss(10) });
    const byKey = new Map(p.map((x) => [x.key, x]));
    expect(byKey.get("em/gauss-applications")?.confidence).toBe("high");
    expect(byKey.get("em/gauss-applications")?.reasons[0]).toBe(
      "builds on Gauss's Law, where you scored 40%",
    );
    expect(byKey.get("em/gauss-applications")?.fix).toEqual({
      key: "em/gauss-law",
      name: "Gauss's Law",
      minutes: 10,
    });
    expect(byKey.get("em/capacitance")?.confidence).toBe("medium");
    // Across subjects: the shared maths skill.
    expect(byKey.get("engg-math/divergence")?.reasons[0]).toMatch(/in another subject/);
    expect(byKey.has("em/ohms-law")).toBe(false);
    expect(byKey.has("em/gauss-law")).toBe(false); // already a known weak topic
  });

  it("drops a prediction as soon as the student has done well in it", () => {
    const p = predictTough({ topics, weak: weakGauss(10), doneWell: new Set(["em/capacitance"]) });
    expect(p.some((x) => x.key === "em/capacitance")).toBe(false);
  });

  it("tags topics with shared skills from their names", () => {
    expect(inferSkills("Divergence theorem and Stokes' theorem")).toContain("vector-calculus");
    expect(inferSkills("Thevenin and Norton theorems")).toContain("circuit-analysis");
  });
});

describe("recommended lesson length", () => {
  const known = topicImportance({ papers: { inPapers: 4, totalPapers: 5 } });
  const low = topicImportance({ papers: { inPapers: 0, totalPapers: 5 } });

  it("gives 3–4 options with one recommended, for all six levels", () => {
    for (const level of levels) {
      const a = recommendLength({
        level: level.slug,
        importance: known,
        difficulty: 0.5,
        student: "new",
      });
      expect(a.options.length, level.slug).toBeGreaterThanOrEqual(3);
      expect(a.options.length, level.slug).toBeLessThanOrEqual(4);
      expect(a.options, level.slug).toContain(a.recommended);
      expect(a.why).toMatch(new RegExp(`^Recommended ${a.recommended} min: `));
    }
  });

  it("is longer for first encounters than last-minute revision, and for high-return or weak topics", () => {
    const len = (
      level: string,
      importance = known,
      student: "new" | "weak" | "done-well" = "new",
    ) => recommendLength({ level, importance, difficulty: 0.5, student }).recommended;
    expect(len("first-encounter")).toBeGreaterThan(len("last-minute"));
    expect(len("exam-prep", known)).toBeGreaterThan(len("exam-prep", low));
    expect(len("first-encounter", known, "weak")).toBeGreaterThan(
      len("first-encounter", known, "done-well"),
    );
  });

  it("stays within sensible limits and is never certain when importance is unknown", () => {
    const a = recommendLength({
      level: "last-minute",
      importance: known,
      difficulty: 1,
      student: "weak",
    });
    expect(a.recommended).toBeLessThanOrEqual(15);
    const b = recommendLength({
      level: "deep-dive",
      importance: topicImportance({}),
      difficulty: 0,
      student: "new",
    });
    expect(b.certain).toBe(false);
    expect(b.why).toMatch(/importance not known yet/);
    expect(difficultyOf(10, true)).toBeLessThanOrEqual(1);
  });
});

describe("time range", () => {
  it("gives the highest priority the maximum and the lowest the minimum", () => {
    const high = topicPriority(
      "a",
      topicImportance({ papers: { inPapers: 5, totalPapers: 5 } }),
      "weak",
      "first-encounter",
    );
    const mid = topicPriority("b", topicImportance({}), "new", "first-encounter");
    const lowP = topicPriority(
      "c",
      topicImportance({ papers: { inPapers: 0, totalPapers: 5 } }),
      "done-well",
      "first-encounter",
    );
    const m = minutesInRange([high, mid, lowP], 5, 30);
    expect(m.get("a")).toBe(30);
    expect(m.get("c")).toBe(5);
    expect(m.get("b")).toBeGreaterThan(5);
    expect(m.get("b")).toBeLessThan(30);
    expect(high.tags).toEqual(["high-return", "weak"]);
    // One topic (or all equal) gets the middle of the range.
    expect(minutesInRange([mid], 10, 30).get("b")).toBe(20);
  });
});

describe("prerequisiteDepth", () => {
  const topics = [
    { id: "a" },
    { id: "b", requires: ["a"] },
    { id: "c", requires: ["b", "a"] },
    { id: "loop1", requires: ["loop2"] },
    { id: "loop2", requires: ["loop1"] },
  ];
  it("counts every earlier topic once", () => {
    expect(prerequisiteDepth(topics, "a")).toBe(0);
    expect(prerequisiteDepth(topics, "c")).toBe(2);
  });
  it("survives a cycle in the data", () => {
    expect(prerequisiteDepth(topics, "loop1")).toBe(1);
  });
});
