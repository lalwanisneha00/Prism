import { describe, expect, it } from "vitest";
import {
  apportion,
  blueprintMarks,
  defaultPattern,
  describePattern,
  EXAM_STYLES,
  mergePatterns,
  MAX_QUESTIONS,
  patternMarks,
  scalePattern,
  sectionMarks,
  suggestMinutes,
  type PaperPattern,
  type QuestionType,
} from "@/lib/mock/pattern";

const marksByType = (sections: ReturnType<typeof scalePattern>) => {
  const out = new Map<QuestionType, number>();
  for (const s of sections) {
    const counted = s.attempt ? s.slots.slice(0, s.attempt) : s.slots;
    for (const q of counted) out.set(q.type, (out.get(q.type) ?? 0) + q.marks);
  }
  return out;
};

describe("paper patterns", () => {
  it("each default pattern adds up to its stated total", () => {
    for (const style of EXAM_STYLES) {
      const p = defaultPattern(style);
      expect(patternMarks(p)).toBe(p.totalMarks);
    }
  });

  it("a choice section counts only the questions to attempt", () => {
    expect(
      sectionMarks({ attempt: 4, questions: Array(6).fill({ type: "long", marks: 15 }) }),
    ).toBe(60);
    expect(
      sectionMarks({
        questions: [
          { type: "short", marks: 2 },
          { type: "short", marks: 3 },
        ],
      }),
    ).toBe(5);
  });

  it("apportion splits a total exactly", () => {
    expect(apportion(10, [1, 1, 1])).toEqual([4, 3, 3]);
    expect(apportion(30, [10, 30, 60]).reduce((a, b) => a + b, 0)).toBe(30);
    expect(apportion(0, [1, 2])).toEqual([0, 0]);
  });
});

describe("scaling a pattern to the chosen total", () => {
  it("always adds up exactly to the total, for every style and many totals", () => {
    for (const style of EXAM_STYLES) {
      for (const total of [5, 10, 13, 20, 25, 30, 37, 50, 75, 100, 150, 200]) {
        const scaled = scalePattern(defaultPattern(style), total);
        expect(blueprintMarks(scaled), `${style} ${total}`).toBe(total);
        expect(scaled.reduce((n, s) => n + s.slots.length, 0)).toBeLessThanOrEqual(MAX_QUESTIONS);
      }
    }
  });

  it("keeps the mix of question types (100-mark end-sem → 30 marks)", () => {
    const original = defaultPattern("end-sem");
    const scaled = scalePattern(original, 30);
    const types = marksByType(scaled);
    // Objective, short-answer and long-answer parts all survive, in roughly the same shares.
    expect(types.get("mcq")).toBe(3);
    const written = 30 - (types.get("mcq") ?? 0);
    expect(written).toBe(27);
    expect(scaled.map((s) => s.name)).toEqual(["Section A", "Section B", "Section C"]);
    expect(new Set(scaled.flatMap((s) => s.slots.map((q) => q.type))).size).toBeGreaterThanOrEqual(
      3,
    );
  });

  it("keeps internal choice with equal marks per question", () => {
    for (const total of [20, 30, 50]) {
      const scaled = scalePattern(defaultPattern("end-sem"), total);
      for (const s of scaled.filter((x) => x.attempt)) {
        expect(new Set(s.slots.map((q) => q.marks)).size).toBe(1);
        expect(s.slots.length).toBeGreaterThan(s.attempt!);
      }
      expect(scaled.some((s) => s.attempt)).toBe(true);
    }
  });

  it("gives every slot a unique id and whole positive marks", () => {
    const scaled = scalePattern(defaultPattern("mid-sem"), 37);
    const ids = scaled.flatMap((s) => s.slots.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of scaled.flatMap((s) => s.slots)) {
      expect(q.marks).toBeGreaterThan(0);
      expect(Number.isInteger(q.marks)).toBe(true);
    }
  });

  it("scales up as well as down", () => {
    const scaled = scalePattern(defaultPattern("internal"), 100);
    expect(blueprintMarks(scaled)).toBe(100);
  });

  it("handles a long paper with more questions than allowed", () => {
    const huge: Pick<PaperPattern, "sections"> = {
      sections: [
        { name: "A", questions: Array(40).fill({ type: "mcq", marks: 1 }) },
        { name: "B", attempt: 10, questions: Array(20).fill({ type: "short", marks: 3 }) },
        { name: "C", questions: Array(10).fill({ type: "long", marks: 10 }) },
      ],
    };
    const scaled = scalePattern(huge, 170);
    expect(blueprintMarks(scaled)).toBe(170);
    expect(scaled.reduce((n, s) => n + s.slots.length, 0)).toBeLessThanOrEqual(MAX_QUESTIONS);
  });

  it("describes a plan in one line", () => {
    const line = describePattern(scalePattern(defaultPattern("end-sem"), 100));
    expect(line).toContain("Section A: 10 multiple choice × 1");
    expect(line).toMatch(/any 4 of 6/);
  });
});

describe("time and merging", () => {
  it("suggests a time from the paper's own pace, or the usual pace", () => {
    expect(suggestMinutes(100)).toBe(180);
    expect(suggestMinutes(30)).toBe(55);
    expect(suggestMinutes(50, { minutes: 60, totalMarks: 50 })).toBe(60);
    expect(suggestMinutes(1)).toBe(10);
    expect(suggestMinutes(300)).toBe(240);
  });

  it("uses the newest paper's structure and every paper's samples", () => {
    const a = { ...defaultPattern("end-sem"), analysedAt: 1, samples: ["old"] };
    const b = { ...defaultPattern("mid-sem"), analysedAt: 2, samples: ["new"] };
    const merged = mergePatterns([a, b])!;
    expect(merged.totalMarks).toBe(50);
    expect(merged.samples).toEqual(["old", "new"]);
    expect(mergePatterns([])).toBeUndefined();
  });
});
