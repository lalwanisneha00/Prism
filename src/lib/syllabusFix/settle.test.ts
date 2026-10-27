import { describe, expect, it } from "vitest";
import type { Change } from "./handoutMatch";
import { applyOverlay } from "./overlay";
import { memoryProposalStore, type FlagSubmission } from "./proposalStore";

/*
 * The whole Phase 5 flow on the in-memory store: flags and "Agree" votes add up, the rule makes a
 * change go live in the overlay, the history logs it, and rivals or other branches never sneak in.
 */

const at = "2026-10-27T10:00:00.000Z";
const flagger = (uid: string, over: Partial<FlagSubmission> = {}): FlagSubmission => ({
  uid,
  branch: "ict",
  semester: 3,
  profileFrom: "cloud",
  level: "topic",
  flag: {},
  at,
  ...over,
});
const move = (toChapter: string): Change => ({
  type: "topic under wrong unit",
  branch: "ict",
  sem: 3,
  detail: "student flag",
  prism: { subject: "pdeu-ai", chapter: "intro", topic: "astar" },
  to: { subject: "pdeu-ai", chapter: toChapter },
});

describe("auto-apply", () => {
  it("goes live after a flag and an Agree from two students of the branch", async () => {
    const store = memoryProposalStore();
    const a = await store.submitFlag(flagger("a"), move("search"), 1);
    expect((await store.settle(a.proposalId, at))?.verdict.action).toBe("wait");
    await store.castVote({
      proposalId: a.proposalId,
      uid: "b",
      kind: "agree",
      points: 1,
      branch: "ict",
      semester: 3,
      profileFrom: "cloud",
      at,
    });
    expect((await store.settle(a.proposalId, at))?.verdict.action).toBe("wait"); // 2 points
    await store.submitFlag(flagger("c"), move("search"), 1);
    const result = await store.settle(a.proposalId, at);
    expect(result).toMatchObject({ verdict: { action: "apply" }, status: "applied" });
    expect(store.live.overlay.changes).toHaveLength(1);
    expect(store.live.overlay.changes[0]).toMatchObject({
      proposalId: a.proposalId,
      supporters: 3,
    });
    expect(store.live.history.map((h) => h.field)).toEqual(["topic under wrong unit"]);
    // Settled: a later vote neither counts nor reopens it.
    const late = await store.castVote({
      proposalId: a.proposalId,
      uid: "d",
      kind: "disagree",
      points: -1,
      branch: "ict",
      semester: 3,
      profileFrom: "cloud",
      at,
    });
    expect(late).toEqual({ counted: false, status: "applied" });
    // The live change is the one the app lays over the course.
    const course = applyOverlay(
      {
        id: "pdeu-ai",
        name: "AI",
        field: "Computing",
        tier: "sourced",
        branches: ["ict"],
        semesters: [3],
        syllabusSource: { kind: "university", title: "PDEU" },
        chapters: [
          {
            id: "intro",
            name: "Intro",
            topics: [
              { id: "astar", name: "A*" },
              { id: "x", name: "X" },
            ],
          },
          { id: "search", name: "Search", topics: [{ id: "bfs", name: "BFS" }] },
        ],
      },
      store.live.overlay,
    );
    expect(course.chapters[1].topics.map((t) => t.id)).toEqual(["bfs", "astar"]);
  });

  it("does not count students of another branch or semester", async () => {
    const store = memoryProposalStore();
    const a = await store.submitFlag(flagger("a"), move("search"), 1);
    await store.submitFlag(flagger("b", { branch: "ce" }), move("search"), 1);
    await store.submitFlag(flagger("c", { semester: 5 }), move("search"), 1);
    expect((await store.settle(a.proposalId, at))?.verdict.action).toBe("wait");
    expect(store.proposals.get(a.proposalId)?.points).toBe(1);
  });

  it("sends two strong opposite proposals to the conflicts queue", async () => {
    const store = memoryProposalStore();
    const toSearch = await store.submitFlag(flagger("a"), move("search"), 1);
    await store.submitFlag(flagger("b"), move("search"), 1);
    const toOther = await store.submitFlag(flagger("c"), move("logic"), 1);
    await store.submitFlag(flagger("d"), move("logic"), 1);
    await store.submitFlag(flagger("e"), move("search"), 1);
    const result = await store.settle(toSearch.proposalId, at);
    expect(result?.verdict).toEqual({ action: "conflict", rivals: [toOther.proposalId] });
    expect(store.proposals.get(toOther.proposalId)?.status).toBe("conflict");
    expect(store.live.overlay.changes).toHaveLength(0);
  });

  it("queues a new course for the admin instead of making it", async () => {
    const store = memoryProposalStore();
    const change: Change = {
      type: "new course",
      branch: "ict",
      sem: 3,
      detail: "student",
      handout: { course: "Quantum Computing", code: null },
      to: { branch: "ict", semester: 3 },
    };
    const a = await store.submitFlag(flagger("a"), change, 1);
    await store.submitFlag(flagger("b"), change, 1);
    await store.submitFlag(flagger("c"), change, 1);
    expect(await store.settle(a.proposalId, at)).toMatchObject({
      verdict: { action: "review" },
      status: "review",
    });
    expect(store.live.overlay.changes).toHaveLength(0);
  });
});
