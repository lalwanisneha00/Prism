import { describe, expect, it } from "vitest";
import { afterRevert, pausedSet, resumeTrust, takeAllowance, usageId } from "./abuse";
import { voteCounts } from "./voting";

const at = "2026-10-27T10:00:00.000Z";
const limits = { flag: 2, missing: 1, handout: 1, vote: 3, lessonFlag: 2 };

describe("daily limits", () => {
  it("counts each kind on its own and stops at the limit", () => {
    const a = takeAllowance(undefined, "u", "flag", at, limits);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const b = takeAllowance(a.usage, "u", "flag", at, limits);
    expect(b.ok && b.usage.counts).toEqual({ flag: 2 });
    if (!b.ok) return;
    expect(takeAllowance(b.usage, "u", "flag", at, limits)).toEqual({ ok: false, limit: 2 });
    // Another kind still has its own allowance.
    expect(takeAllowance(b.usage, "u", "vote", at, limits).ok).toBe(true);
  });

  it("starts again on a new day", () => {
    const full = { uid: "u", day: "2026-10-27", counts: { flag: 2 } };
    expect(takeAllowance(full, "u", "flag", "2026-10-28T00:01:00.000Z", limits)).toMatchObject({
      ok: true,
      usage: { day: "2026-10-28", counts: { flag: 1 } },
    });
    expect(usageId("u", at)).toBe("u__2026-10-27");
  });
});

describe("paused votes after reverts", () => {
  it("pauses at the third reverted fix, counting each fix once", () => {
    let t = afterRevert(undefined, "u", "p1", at, { pauseAfterReverts: 3 });
    t = afterRevert(t, "u", "p1", at, { pauseAfterReverts: 3 });
    t = afterRevert(t, "u", "p2", at, { pauseAfterReverts: 3 });
    expect(t).toMatchObject({ revertedFixes: ["p1", "p2"], paused: false });
    t = afterRevert(t, "u", "p3", at, { pauseAfterReverts: 3 });
    expect(t.paused).toBe(true);
    expect([...pausedSet([t, undefined])]).toEqual(["u"]);
  });

  it("the admin can lift a pause; the next revert pauses again", () => {
    const paused = { uid: "u", revertedFixes: ["a", "b", "c"], paused: true, updatedAt: at };
    const lifted = resumeTrust(paused, at);
    expect(lifted).toMatchObject({ paused: false, resumedAt: 3 });
    expect(afterRevert(lifted, "u", "d", at).paused).toBe(true);
  });

  it("a paused student's vote is kept but does not count", () => {
    const vote = {
      uid: "u",
      kind: "agree" as const,
      points: 1,
      branch: "ict",
      semester: 3,
      profileFrom: "cloud" as const,
      at,
    };
    const where = { branch: "ict", semester: 3 };
    expect(voteCounts(vote, where).counts).toBe(true);
    expect(voteCounts(vote, where, {}, undefined, new Set(["u"]))).toEqual({
      counts: false,
      reason: "votes paused",
    });
  });
});
