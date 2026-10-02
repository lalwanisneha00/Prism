import { describe, expect, it } from "vitest";
import { chapterProgress, localDate, streak } from "@/lib/progress/tracker";
import { subjects } from "@/lib/subjects";

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 15).getTime();

describe("streak", () => {
  const days = new Set([at(2026, 10, 1), at(2026, 10, 2), at(2026, 10, 3)].map(localDate));

  it("counts consecutive days ending today", () => {
    expect(streak(days, "2026-10-03")).toEqual({ days: 3, studiedToday: true });
  });

  it("keeps a streak alive today if it ended yesterday, and resets after a gap", () => {
    expect(streak(days, "2026-10-04")).toEqual({ days: 3, studiedToday: false });
    expect(streak(days, "2026-10-05")).toEqual({ days: 0, studiedToday: false });
  });

  it("crosses month and year ends", () => {
    const yearEnd = new Set([at(2026, 12, 31), at(2027, 1, 1)].map(localDate));
    expect(streak(yearEnd, "2027-01-01").days).toBe(2);
  });
});

describe("chapterProgress", () => {
  it("counts topic statuses per chapter", () => {
    const em = subjects.find((s) => s.id === "em")!;
    const statuses = new Map([
      ["coulombs-law", "mastered" as const],
      ["electric-field", "tried" as const],
      ["gauss-law", "weak" as const],
    ]);
    const [electrostatics, capacitance] = chapterProgress(em, statuses);
    expect(electrostatics).toMatchObject({ mastered: 1, tried: 1, weak: 1, total: 8 });
    expect(capacitance).toMatchObject({ mastered: 0, total: 5 });
  });
});
