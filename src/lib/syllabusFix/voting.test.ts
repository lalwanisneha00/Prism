import { describe, expect, it } from "vitest";
import { SYLLABUS_FIX_CONFIG } from "./config";
import type { Vote } from "./proposals";
import { decide, plainChange, tally, voteCounts } from "./voting";

const proposal = { branch: "ict", semester: 3 };
const vote = (uid: string, over: Partial<Vote> = {}): Vote => ({
  uid,
  kind: "flag",
  points: 1,
  branch: "ict",
  semester: 3,
  profileFrom: "cloud",
  at: "2026-10-27T10:00:00.000Z",
  ...over,
});

describe("voteCounts", () => {
  it("counts students of the same branch and semester only", () => {
    expect(voteCounts(vote("a"), proposal).counts).toBe(true);
    expect(voteCounts(vote("a", { branch: "ce" }), proposal)).toEqual({
      counts: false,
      reason: "other branch",
    });
    expect(voteCounts(vote("a", { semester: 4 }), proposal)).toEqual({
      counts: false,
      reason: "other semester",
    });
  });

  it("leaves out other batches when the course names its batches", () => {
    const course = { batchYears: [2024] };
    expect(voteCounts(vote("a", { batchYear: 2023 }), proposal, course).counts).toBe(false);
    expect(voteCounts(vote("a", { batchYear: 2024 }), proposal, course).counts).toBe(true);
    // No batch on the student's profile: still counts.
    expect(voteCounts(vote("a"), proposal, course).counts).toBe(true);
  });

  it("never counts Not sure, and device profiles only when allowed", () => {
    expect(voteCounts(vote("a", { kind: "unsure", points: 0 }), proposal).counts).toBe(false);
    const strict = { ...SYLLABUS_FIX_CONFIG, countDeviceProfiles: false };
    expect(voteCounts(vote("a", { profileFrom: "device" }), proposal, {}, strict).counts).toBe(
      false,
    );
  });
});

describe("tally and decide", () => {
  it("passes at 3 points from 2 students", () => {
    const t = tally(proposal, [vote("a", { kind: "handout", points: 3 }), vote("b")]);
    expect(t).toMatchObject({ points: 4, supporters: 2 });
    expect(decide({ status: "pending", type: "topic missing" }, t, [])).toEqual({
      action: "apply",
    });
  });

  it("waits for a second student, however many points one student brings", () => {
    const t = tally(proposal, [vote("a", { kind: "handout", points: 3 })]);
    expect(decide({ status: "pending", type: "topic missing" }, t, [])).toEqual({ action: "wait" });
  });

  it("counts each student once and lets Disagree take points away", () => {
    const t = tally(proposal, [
      vote("a"),
      vote("a"),
      vote("b"),
      vote("c", { kind: "disagree", points: -1 }),
    ]);
    expect(t).toMatchObject({ points: 1, supporters: 2 });
  });

  it("ignores other branches' votes", () => {
    const t = tally(proposal, [
      vote("a"),
      vote("b", { branch: "ce" }),
      vote("c", { branch: "ce" }),
    ]);
    expect(t.points).toBe(1);
    expect(t.ignored.map((i) => i.reason)).toEqual(["other branch", "other branch"]);
  });

  it("sends changes students cannot make alone to the admin", () => {
    const t = tally(proposal, [vote("a"), vote("b"), vote("c")]);
    expect(decide({ status: "pending", type: "new course" }, t, [])).toEqual({ action: "review" });
    expect(decide({ status: "pending", type: "unit under wrong course" }, t, [])).toEqual({
      action: "review",
    });
  });

  it("holds both sides of a conflict when the rival is strong", () => {
    const t = tally(proposal, [vote("a"), vote("b"), vote("c")]);
    const type = "course in wrong semester";
    expect(decide({ status: "pending", type }, t, [{ id: "x", points: 2 }])).toEqual({
      action: "conflict",
      rivals: ["x"],
    });
    // A weak rival (1 point) does not block it.
    expect(decide({ status: "pending", type }, t, [{ id: "x", points: 1 }])).toEqual({
      action: "apply",
    });
  });

  it("never reopens a settled proposal", () => {
    const t = tally(proposal, [vote("a"), vote("b"), vote("c")]);
    expect(decide({ status: "applied", type: "topic missing" }, t, [])).toEqual({ action: "wait" });
  });
});

describe("plainChange", () => {
  it("says the change in a student's words, without ids or em dashes", () => {
    const text = plainChange(
      { type: "course in wrong semester", sem: 3, to: { semester: 3 } },
      { course: "Introduction to Artificial Intelligence" },
    );
    expect(text).toBe("Introduction to Artificial Intelligence is taught in semester 3");
    const moved = plainChange(
      { type: "topic under wrong unit", sem: 3 },
      { course: "AI", topic: "A* search", toChapter: "Searching" },
    );
    expect(moved).toBe('"A* search" belongs in the chapter "Searching" of AI');
    expect(`${text}${moved}`).not.toMatch(/—/);
  });
});
