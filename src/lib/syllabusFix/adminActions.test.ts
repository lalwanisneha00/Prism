import { describe, expect, it } from "vitest";
import type { Subject } from "@/lib/subjects";
import { branchHealth, lessonAfterAdmin, nearThreshold } from "./adminActions";
import { memoryAdminStore } from "./adminStore";
import type { Change } from "./handoutMatch";
import { newLessonStatus } from "./lessonReview";
import { memoryLessonFlagStore } from "./lessonFlagStore";
import { activeChanges, EMPTY_OVERLAY, staleFromOverlay } from "./overlay";
import { memoryProposalStore, type FlagSubmission } from "./proposalStore";

/*
 * The admin's buttons (Phase 6) on the in-memory stores: conflicts are decided, live fixes are
 * reverted with the history and the backers' records updated, and paused students stop counting.
 */

const at = "2026-10-27T10:00:00.000Z";
const later = "2026-10-27T12:00:00.000Z";
const admin = { uid: "owner" };

const flagger = (uid: string): FlagSubmission => ({
  uid,
  branch: "ict",
  semester: 3,
  profileFrom: "cloud",
  level: "topic",
  flag: {},
  at,
});
const move = (toChapter: string): Change => ({
  type: "topic under wrong unit",
  branch: "ict",
  sem: 3,
  detail: "student flag",
  prism: { subject: "pdeu-ai", chapter: "intro", topic: "astar" },
  to: { subject: "pdeu-ai", chapter: toChapter },
});
const missingUnit: Change = {
  type: "unit missing",
  branch: "ict",
  sem: 3,
  detail: "student flag",
  handout: { course: "AI", code: null, unit: "Planning" },
  prism: { subject: "pdeu-ai" },
};

async function flagAll(
  ps: ReturnType<typeof memoryProposalStore>,
  uids: string[],
  change: Change,
): Promise<string> {
  let id = "";
  for (const uid of uids) {
    const r = await ps.submitFlag(flagger(uid), change, 1);
    id = r.proposalId;
    await ps.settle(id, at);
  }
  return id;
}

function stores() {
  const ps = memoryProposalStore();
  const ls = memoryLessonFlagStore();
  return { ps, ls, admin: memoryAdminStore(ps, ls) };
}

describe("conflicts", () => {
  it("approving one side makes it live and rejects the other", async () => {
    const { ps, admin: store } = stores();
    const other = await flagAll(ps, ["d", "e"], move("other"));
    const search = await flagAll(ps, ["a", "b", "c"], move("search"));
    const board = await store.dashboard();
    expect(board.conflicts.map((p) => p.id).sort()).toEqual([other, search].sort());

    expect(await store.decide(search, "approve", admin, later)).toEqual({
      ok: true,
      outcome: "live",
    });
    expect(ps.proposals.get(search)).toMatchObject({ status: "applied", decidedBy: "owner" });
    expect(ps.proposals.get(other)?.status).toBe("rejected");
    expect(activeChanges(ps.live.overlay).map((c) => c.proposalId)).toEqual([search]);
    expect(ps.live.history.filter((h) => h.actor.kind === "admin").length).toBeGreaterThan(1);
    // Decided: a second click does nothing.
    expect((await store.decide(search, "reject", admin, later)).ok).toBe(false);
  });

  it("reject both", async () => {
    const { ps, admin: store } = stores();
    const other = await flagAll(ps, ["d", "e"], move("other"));
    const search = await flagAll(ps, ["a", "b", "c"], move("search"));
    expect(await store.decide(other, "reject", admin, later)).toMatchObject({ ok: true });
    expect([ps.proposals.get(other)?.status, ps.proposals.get(search)?.status]).toEqual([
      "rejected",
      "rejected",
    ]);
    expect(ps.live.overlay.changes).toHaveLength(0);
  });
});

describe("review queue", () => {
  it("a change the overlay cannot make is accepted for the next data update", async () => {
    const { ps, admin: store } = stores();
    const id = await flagAll(ps, ["a", "b", "c"], missingUnit);
    expect(ps.proposals.get(id)?.status).toBe("review");
    expect(await store.decide(id, "approve", admin, later)).toEqual({
      ok: true,
      outcome: "accepted",
    });
    expect((await store.dashboard()).accepted.map((p) => p.id)).toEqual([id]);
    expect(ps.live.overlay.changes).toHaveLength(0);
  });
});

describe("revert", () => {
  it("switches the fix off, marks the history and the backers", async () => {
    const { ps, admin: store } = stores();
    const id = await flagAll(ps, ["a", "b", "c"], move("search"));
    expect(ps.proposals.get(id)?.status).toBe("applied");
    expect((await store.dashboard()).recent.map((c) => c.proposalId)).toEqual([id]);

    expect(await store.revert(id, admin, later)).toEqual({ ok: true, outcome: "reverted" });
    expect(ps.proposals.get(id)).toMatchObject({ status: "rejected", revertedAt: later });
    expect(ps.live.overlay.changes[0]).toMatchObject({ reverted: true, revertedAt: later });
    expect(activeChanges(ps.live.overlay)).toHaveLength(0);
    const applied = ps.live.history.find(
      (h) => h.field === "topic under wrong unit" && h.oldValue === null,
    );
    const undo = ps.live.history.find((h) => h.cause === `revert proposal ${id}`);
    expect(applied).toMatchObject({ reverted: true, revertedBy: undo?.id });
    expect(undo?.actor).toEqual({ kind: "admin", id: "owner" });
    expect([...ps.trusts.keys()].sort()).toEqual(["a", "b", "c"]);
    // Lessons written while the fix was live are stale from the revert.
    expect(staleFromOverlay(ps.live.overlay, { version: 1, topics: {} }).topics).toEqual({
      "pdeu-ai/astar": later,
    });
    // Not live any more: a second revert is refused, and a new flag does not reopen it.
    expect((await store.revert(id, admin, later)).ok).toBe(false);
    expect((await ps.submitFlag(flagger("z"), move("search"), 1)).counted).toBe(false);
  });

  it("a student whose fixes keep being reverted stops counting", async () => {
    const { ps, admin: store } = stores();
    ps.trusts.set("a", { uid: "a", revertedFixes: ["x", "y", "z"], paused: true, updatedAt: at });
    const id = await flagAll(ps, ["a", "b", "c"], move("search"));
    expect(ps.proposals.get(id)).toMatchObject({ status: "pending", points: 2, voters: 2 });
    expect((await store.dashboard()).paused.map((t) => t.uid)).toEqual(["a"]);
    await store.resume("a", later);
    await ps.settle(id, later);
    expect(ps.proposals.get(id)?.status).toBe("applied");
  });
});

describe("lessons and lists", () => {
  it("marks a lesson in review fine, or queues one rebuild", () => {
    const status = {
      ...newLessonStatus({ lessonKey: "k", subject: "s", topic: "t" }, at),
      state: "review" as const,
      flaggedBy: ["a", "b", "c", "d"],
      regenerations: 1,
      claimedAt: at,
    };
    expect(lessonAfterAdmin(status, "fine", later)).toMatchObject({
      state: "ok",
      flaggedBy: [],
      version: 1,
    });
    const again = lessonAfterAdmin(status, "regenerate", later);
    expect(again.state).toBe("needs_regeneration");
    expect(again.claimedAt).toBeUndefined();
  });

  it("lists pending suggestions close to the rule, strongest first", () => {
    const p = (id: string, points: number, status = "pending") => ({
      id,
      points,
      voters: points,
      status: status as "pending",
      change: {},
      type: "t",
      subject: "s",
      branch: "ict",
      semester: 3,
      createdAt: at,
      updatedAt: at,
    });
    expect(nearThreshold([p("a", 1), p("b", 2), p("c", 0), p("d", 2.5)]).map((x) => x.id)).toEqual([
      "d",
      "b",
    ]);
  });

  it("works out how much of each branch is verified", () => {
    const course = (id: string, branch: string, confidence?: "verified"): Subject => ({
      id,
      name: id,
      field: "Computing",
      tier: "sourced",
      branches: [branch],
      semesters: [3],
      syllabusSource: { kind: "university", title: "PDEU" },
      university: "pdeu",
      ...(confidence ? { confidence } : {}),
      chapters: [{ id: "c", name: "C", topics: [{ id: "t", name: "T" }] }],
    });
    const list = [course("a", "ict", "verified"), course("b", "ict"), course("c", "ce")];
    expect(branchHealth(list, EMPTY_OVERLAY, ["ict", "ce", "me"])).toEqual([
      { branch: "ict", courses: 2, verified: 1, percent: 50 },
      { branch: "ce", courses: 1, verified: 0, percent: 0 },
      { branch: "me", courses: 0, verified: 0, percent: 0 },
    ]);
  });
});
