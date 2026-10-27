import { describe, expect, it } from "vitest";
import { badgeFor, chapterBadgeWanted, liveSupport } from "./badges";
import type { AppliedChange, Overlay } from "./overlay";
import { DEFAULT_META } from "./tree";

const at = "2026-10-27T10:00:00.000Z";
const fix = (over: Partial<AppliedChange> & Pick<AppliedChange, "change">): AppliedChange => ({
  proposalId: `p${Math.random()}`,
  appliedAt: at,
  supporters: 2,
  ...over,
});
const sheet = (...changes: AppliedChange[]): Overlay => ({ version: 1, updatedAt: at, changes });

const rename = fix({
  change: {
    type: "unit rename",
    branch: "comp",
    sem: 3,
    prism: { subject: "pdeu-ai", chapter: "u1" },
    handout: { unit: "Search" },
  },
  supporters: 3,
  batchYear: 2025,
});
const moved = fix({
  change: {
    type: "course in wrong semester",
    branch: "comp",
    sem: 3,
    prism: { subject: "pdeu-ai" },
    to: { semester: 4 },
  },
});

describe("liveSupport", () => {
  it("finds course-level fixes for the course and chapter fixes for the chapter", () => {
    const o = sheet(rename, moved);
    expect(liveSupport(o, "pdeu-ai")).toEqual({ students: 2, branch: "comp" });
    expect(liveSupport(o, "pdeu-ai", "u1")).toEqual({
      students: 3,
      branch: "comp",
      batchYear: 2025,
    });
    expect(liveSupport(o, "pdeu-ai", "u2")).toBeUndefined();
    expect(liveSupport(o, "pdeu-other")).toBeUndefined();
  });

  it("ignores reverted fixes", () => {
    expect(liveSupport(sheet({ ...rename, reverted: true }), "pdeu-ai", "u1")).toBeUndefined();
  });
});

describe("badgeFor", () => {
  it("says who verified a live fix", () => {
    const b = badgeFor(DEFAULT_META, {
      students: 3,
      branchName: "Computer Engineering",
      batchYear: 2025,
    });
    expect(b).toEqual({
      tone: "verified",
      text: "Verified by 3 students from Computer Engineering, 2025 batch",
      helpVerify: false,
    });
    expect(badgeFor(DEFAULT_META, { students: 1 }).text).toBe("Verified by 1 student");
  });

  it("keeps the count of a fix already copied into the data", () => {
    const meta = { ...DEFAULT_META, source: "student_fix" as const, verifiedByCount: 4 };
    expect(badgeFor({ ...meta, confidence: "verified" }).text).toBe("Verified by 4 students");
  });

  it("asks for help when the syllabus came from the website", () => {
    expect(badgeFor(DEFAULT_META)).toEqual({
      tone: "unverified",
      text: "From official website, may be outdated",
      helpVerify: true,
    });
    const handout = { ...DEFAULT_META, source: "admin_handout" as const };
    expect(badgeFor({ ...handout, confidence: "verified" }).helpVerify).toBe(false);
    expect(badgeFor({ ...handout, confidence: "pending" }).tone).toBe("pending");
  });
});

describe("chapterBadgeWanted", () => {
  const verified = badgeFor({ ...DEFAULT_META, source: "admin_handout", confidence: "verified" });
  const unverified = badgeFor(DEFAULT_META);
  it("shows a chapter badge only when it says something the course badge does not", () => {
    expect(chapterBadgeWanted(verified, verified)).toBe(false);
    expect(chapterBadgeWanted(unverified, unverified)).toBe(false);
    expect(chapterBadgeWanted(verified, unverified)).toBe(true);
    expect(chapterBadgeWanted(unverified, verified)).toBe(false);
    expect(chapterBadgeWanted(verified, badgeFor(DEFAULT_META, { students: 2 }))).toBe(true);
  });
});
