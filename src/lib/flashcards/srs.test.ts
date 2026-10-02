import { describe, expect, it } from "vitest";
import { describeNext, isDue, newSrs, review } from "@/lib/flashcards/srs";

const DAY = 86_400_000;
const t0 = Date.UTC(2026, 9, 3);

describe("SM-2 spaced repetition", () => {
  it("spaces a well-known card further apart each time: 1, 6, then ×ease days", () => {
    let s = newSrs(t0);
    expect(isDue(s, t0)).toBe(true);
    s = review(s, "good", t0);
    expect(s.interval).toBe(1);
    s = review(s, "good", s.due);
    expect(s.interval).toBe(6);
    s = review(s, "good", s.due);
    expect(s.interval).toBe(15); // 6 × 2.5
    expect(s.due).toBe(t0 + DAY + 6 * DAY + 15 * DAY);
    expect(s.reps).toBe(3);
  });

  it("brings a forgotten card back in 10 minutes and makes it harder", () => {
    const learned = review(review(newSrs(t0), "good", t0), "good", t0 + DAY);
    const forgot = review(learned, "again", t0 + 7 * DAY);
    expect(forgot.due - (t0 + 7 * DAY)).toBe(10 * 60_000);
    expect(forgot.reps).toBe(0);
    expect(forgot.lapses).toBe(1);
    expect(forgot.ease).toBeCloseTo(2.3, 9);
    // Ease never drops below 1.3, however often you forget.
    let s = learned;
    for (let i = 0; i < 20; i++) s = review(s, "again", t0);
    expect(s.ease).toBe(1.3);
  });

  it("hard grows slowly and easy jumps ahead", () => {
    const s = review(review(newSrs(t0), "good", t0), "good", t0 + DAY); // interval 6
    expect(review(s, "hard", t0).interval).toBeLessThan(review(s, "good", t0).interval);
    expect(review(s, "easy", t0).interval).toBeGreaterThan(review(s, "good", t0).interval);
    expect(review(newSrs(t0), "easy", t0).interval).toBe(4);
  });

  it("labels the next interval on each button", () => {
    const s = newSrs(t0);
    expect(describeNext(s, "again", t0)).toBe("10 min");
    expect(describeNext(s, "good", t0)).toBe("1 day");
    expect(describeNext(s, "easy", t0)).toBe("4 days");
    let long = s;
    for (let i = 0; i < 6; i++) long = review(long, "easy", long.due);
    expect(describeNext(long, "good", long.due)).toMatch(/mo|yr/);
  });
});
