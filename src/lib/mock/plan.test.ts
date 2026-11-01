import { describe, expect, it } from "vitest";
import { defaultPattern, blueprintMarks, type PaperPattern } from "@/lib/mock/pattern";
import {
  batches,
  minutesFor,
  patternForStyle,
  planPaper,
  startingSettings,
  stylesFor,
  type PaperInfo,
} from "@/lib/mock/plan";
import { parseSession } from "@/lib/mock/session";

const pattern = (minutes: number, total: number): PaperPattern => ({
  ...defaultPattern("mid-sem"),
  minutes,
  totalMarks: total,
  analysedAt: 5,
  source: "ai",
});
const papers: PaperInfo[] = [
  {
    id: "1",
    name: "mid.pdf",
    subject: "s",
    kind: "mid-sem",
    pattern: pattern(60, 50),
    local: true,
  },
  { id: "2", name: "end.pdf", subject: "s", kind: "end-sem", local: false },
];
const topics = ["a", "b", "c"].map((id, i) => ({ id, name: `Topic ${id}`, unitId: `u${i}` }));

describe("planning a mock", () => {
  it("offers only the styles the student has papers for", () => {
    expect(stylesFor(papers)).toEqual(["end-sem", "mid-sem"]);
    expect(stylesFor([])).toEqual([]);
  });

  it("copies the papers' pattern when read, else the default (and says which)", () => {
    expect(patternForStyle(papers, "mid-sem")).toMatchObject({ fromPapers: true });
    expect(patternForStyle(papers, "end-sem")).toMatchObject({ fromPapers: false });
    expect(patternForStyle(papers, "default").pattern.totalMarks).toBe(100);
  });

  it("suggests time from the papers' pace", () => {
    expect(minutesFor(50, papers, "mid-sem")).toBe(60);
    expect(minutesFor(50, papers, "default")).toBe(90);
  });

  it("starts from the saved settings, dropping a style with no papers left", () => {
    const saved = {
      marks: 50,
      minutes: 60,
      style: "internal" as const,
      difficulty: "hard" as const,
      pyqRepeat: true,
    };
    expect(startingSettings(saved, ["mid-sem"])).toMatchObject({
      marks: 50,
      style: "default",
      difficulty: "hard",
    });
    expect(startingSettings(undefined, ["end-sem", "mid-sem"])).toMatchObject({
      marks: 30,
      style: "mid-sem",
    });
    expect(startingSettings(undefined, [])).toMatchObject({ style: "default" });
  });

  it("plans a paper with exactly the chosen marks, only on the chosen topics", () => {
    for (const marks of [10, 20, 30, 50, 100]) {
      const plan = planPaper(defaultPattern("end-sem"), marks, topics);
      expect(blueprintMarks(plan)).toBe(marks);
      expect(plan.flatMap((s) => s.slots).every((q) => ["a", "b", "c"].includes(q.topic))).toBe(
        true,
      );
    }
  });

  it("asks for big sections a few questions at a time", () => {
    const plan = planPaper(defaultPattern("end-sem"), 100, topics);
    const parts = batches(plan[0], 4);
    expect(parts.map((p) => p.slots.length)).toEqual([4, 4, 2]);
  });

  it("restores only a well-formed saved test", () => {
    expect(parseSession({ version: 1 })).toBeNull();
    expect(parseSession(null)).toBeNull();
  });
});
