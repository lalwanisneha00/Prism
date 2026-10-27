import { describe, expect, it } from "vitest";
import { contributionsOf, creditedUids, MAX_CREDITS, thanksLine, withCredit } from "./credits";
import type { AppliedChange, Overlay } from "./overlay";
import type { Vote } from "./proposals";

const at = "2026-10-28T10:00:00.000Z";
const proposal = { branch: "ict", semester: 3 };
const vote = (uid: string, over: Partial<Vote> = {}): Vote => ({
  uid,
  kind: "flag",
  points: 1,
  branch: "ict",
  semester: 3,
  profileFrom: "cloud",
  at,
  ...over,
});
const fix = (proposalId: string, over: Partial<AppliedChange> = {}): AppliedChange => ({
  proposalId,
  change: { type: "unit rename", branch: "ict", sem: 3, handout: { unit: "Search" } },
  appliedAt: at,
  supporters: 2,
  ...over,
});
const sheet = (...changes: AppliedChange[]): Overlay => ({ version: 1, updatedAt: at, changes });

describe("creditedUids", () => {
  it("thanks each student whose vote counted and added points, once", () => {
    const votes = [
      vote("a", { kind: "handout", points: 3 }),
      vote("b", { kind: "agree" }),
      vote("b", { kind: "agree" }),
      vote("c", { kind: "disagree", points: -1 }),
      vote("d", { kind: "unsure", points: 0 }),
      vote("e", { branch: "ce" }),
      vote("f"),
    ];
    expect(creditedUids(proposal, votes, {}, new Set(["f"]))).toEqual(["a", "b"]);
  });
});

describe("withCredit", () => {
  it("adds a fix once and keeps the newest ones", () => {
    const one = withCredit(undefined, "a", "p1", at);
    expect(one.fixes).toEqual([{ proposalId: "p1", appliedAt: at }]);
    expect(withCredit(one, "a", "p1", "2026-10-29T00:00:00.000Z")).toBe(one);
    let many = one;
    for (let i = 0; i < MAX_CREDITS + 5; i++) many = withCredit(many, "a", `q${i}`, at);
    expect(many.fixes).toHaveLength(MAX_CREDITS);
    expect(many.fixes.at(-1)?.proposalId).toBe(`q${MAX_CREDITS + 4}`);
  });
});

describe("contributionsOf", () => {
  it("lists the student's fixes that are still live, newest first", () => {
    const credits = {
      uid: "a",
      fixes: ["p1", "p2", "p3", "gone"].map((proposalId) => ({ proposalId, appliedAt: at })),
      updatedAt: at,
    };
    const overlay = sheet(
      fix("p1", { appliedAt: "2026-10-01T00:00:00.000Z" }),
      fix("p2", { appliedAt: "2026-10-05T00:00:00.000Z", supporters: 4 }),
      fix("p3", { reverted: true }),
    );
    const list = contributionsOf(credits, overlay, (c) => c.type);
    expect(list.map((c) => [c.proposalId, c.students])).toEqual([
      ["p2", 4],
      ["p1", 2],
    ]);
    expect(contributionsOf(undefined, overlay, (c) => c.type)).toEqual([]);
  });

  it("thanks in plain words", () => {
    expect(thanksLine({ text: "Introduction to AI is taught in semester 3", students: 1 })).toBe(
      "Your fix went live: Introduction to AI is taught in semester 3. 1 student backed it, and it now shows for everyone in your class.",
    );
  });
});
