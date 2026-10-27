import { describe, expect, it } from "vitest";
import type { Subject } from "@/lib/subjects";
import type { StaleTopics } from "./stale";
import {
  applyOverlay,
  assignIds,
  liveSemesterIds,
  staleFromOverlay,
  type AppliedChange,
  type LiveChange,
  type Overlay,
} from "./overlay";

const course = (): Subject => ({
  id: "pdeu-ai",
  name: "Introduction to AI",
  field: "Computing",
  tier: "sourced",
  branches: ["ict"],
  semesters: [3],
  syllabusSource: { kind: "university", title: "PDEU" },
  university: "pdeu",
  offerings: [
    { branch: "ict", key: "s3-ai", category: "PC", credits: 3, semester: 3, kind: "core" },
  ],
  chapters: [
    {
      id: "intro",
      name: "Unit 1",
      topics: [
        { id: "agents", name: "Intelligent agents" },
        { id: "astar", name: "A* search" },
        { id: "history", name: "History of AI, Turing test" },
      ],
    },
    { id: "search", name: "Searching", topics: [{ id: "bfs", name: "Breadth-first search" }] },
  ],
});

const at = "2026-10-27T10:00:00.000Z";
const EMPTY_STALE: StaleTopics = { version: 1, topics: {} };
const applied = (change: Omit<LiveChange, "branch" | "sem">, newIds?: string[]): AppliedChange => ({
  proposalId: `p-${change.type}`,
  change: { branch: "ict", sem: 3, ...change },
  appliedAt: at,
  supporters: 2,
  ...(newIds ? { newIds } : {}),
});
const sheet = (...changes: AppliedChange[]): Overlay => ({ version: 1, updatedAt: at, changes });

describe("applyOverlay", () => {
  it("moves a topic to its chapter, keeping its id and where it came from", () => {
    const s = applyOverlay(
      course(),
      sheet(
        applied({
          type: "topic under wrong unit",
          prism: { subject: "pdeu-ai", chapter: "intro", topic: "astar" },
          to: { subject: "pdeu-ai", chapter: "search" },
        }),
      ),
    );
    expect(s.chapters[0].topics.map((t) => t.id)).toEqual(["agents", "history"]);
    expect(s.chapters[1].topics.at(-1)).toMatchObject({
      id: "astar",
      movedFrom: { subject: "pdeu-ai", chapter: "intro", at },
      source: "student_fix",
      confidence: "verified",
      verifiedByCount: 2,
    });
  });

  it("adds a missing topic under the id the server gave it", () => {
    const change = applied(
      {
        type: "topic missing",
        handout: { topic: "Heuristic search" },
        to: { subject: "pdeu-ai", chapter: "search" },
      },
      ["heuristic-search"],
    );
    const s = applyOverlay(course(), sheet(change));
    expect(s.chapters[1].topics.at(-1)).toMatchObject({
      id: "heuristic-search",
      name: "Heuristic search",
      requires: ["bfs"],
    });
  });

  it("splits a topic: the first piece keeps the id", () => {
    const s = applyOverlay(
      course(),
      sheet(
        applied(
          {
            type: "topic split",
            prism: { subject: "pdeu-ai", chapter: "intro", topic: "history" },
            pieces: ["History of AI", "Turing test"],
          },
          ["turing-test"],
        ),
      ),
    );
    expect(s.chapters[0].topics.slice(2).map((t) => [t.id, t.name])).toEqual([
      ["history", "History of AI"],
      ["turing-test", "Turing test"],
    ]);
  });

  it("retires, reorders and renames without deleting anything", () => {
    const s = applyOverlay(
      course(),
      sheet(
        applied({
          type: "extra item not in any handout",
          prism: { subject: "pdeu-ai", chapter: "intro", topic: "history" },
          retire: true,
        }),
        applied({
          type: "unit rename",
          prism: { subject: "pdeu-ai", chapter: "intro" },
          handout: { unit: "Introduction" },
        }),
        applied({
          type: "unit wrong order",
          prism: { subject: "pdeu-ai", chapter: "search" },
          to: { order: 1 },
        }),
      ),
    );
    expect(s.chapters.map((c) => c.id)).toEqual(["search", "intro"]);
    expect(s.chapters[1].name).toBe("Introduction");
    expect(s.chapters[1].topics.find((t) => t.id === "history")?.status).toBe("retired");
  });

  it("moves a course to another semester for one branch, and unlinks it", () => {
    const moved = applyOverlay(
      course(),
      sheet(
        applied({
          type: "course in wrong semester",
          prism: { subject: "pdeu-ai" },
          to: { branch: "ict", semester: 4 },
        }),
      ),
    );
    expect(moved.offerings?.[0].semester).toBe(4);
    expect(moved.semesters).toEqual([4]);
    const linked = applyOverlay(
      course(),
      sheet(
        applied({
          type: "course missing from branch/semester",
          prism: { subject: "pdeu-ai" },
          to: { branch: "ce", semester: 5 },
        }),
      ),
    );
    expect(linked.offerings?.map((o) => [o.branch, o.semester])).toEqual([
      ["ict", 3],
      ["ce", 5],
    ]);
    const unlinked = applyOverlay(
      linked,
      sheet(
        applied({ type: "course in wrong branch", prism: { subject: "pdeu-ai" }, retire: true }),
      ),
    );
    expect(unlinked.offerings?.map((o) => o.branch)).toEqual(["ce"]);
  });

  it("does nothing twice, skips reverted fixes and leaves other courses alone", () => {
    const move = applied({
      type: "topic under wrong unit",
      prism: { subject: "pdeu-ai", chapter: "intro", topic: "astar" },
      to: { subject: "pdeu-ai", chapter: "search" },
    });
    const once = applyOverlay(course(), sheet(move));
    expect(applyOverlay(once, sheet(move))).toBe(once);
    const original = course();
    expect(applyOverlay(original, sheet({ ...move, reverted: true }))).toBe(original);
    expect(applyOverlay({ ...original, id: "other" }, sheet(move)).chapters).toEqual(
      original.chapters,
    );
  });
});

describe("live helpers", () => {
  it("gives new topics ids that are unique in the course", () => {
    const s = course();
    expect(
      assignIds(
        { type: "topic missing", branch: "ict", sem: 3, handout: { topic: "Intelligent agents" } },
        s,
      ),
    ).toEqual(["intelligent-agents"]);
    s.chapters[0].topics.push({ id: "intelligent-agents", name: "x" });
    expect(
      assignIds(
        { type: "topic missing", branch: "ict", sem: 3, handout: { topic: "Intelligent agents" } },
        s,
      ),
    ).toEqual(["intelligent-agents-2"]);
  });

  it("moves courses in and out of a semester's list", () => {
    const s = course();
    const move = sheet(
      applied({
        type: "course in wrong semester",
        prism: { subject: "pdeu-ai" },
        to: { branch: "ict", semester: 4 },
      }),
    );
    const find = (id: string) => (id === s.id ? s : undefined);
    expect(liveSemesterIds(["pdeu-ai", "x"], move, "ict", 3, find)).toEqual(["x"]);
    expect(liveSemesterIds(["y"], move, "ict", 4, find)).toEqual(["y", "pdeu-ai"]);
    expect(liveSemesterIds(["pdeu-ai"], move, "ce", 3, find)).toEqual(["pdeu-ai"]);
  });

  it("marks moved topics stale from the time the fix went live", () => {
    const stale = staleFromOverlay(
      sheet(
        applied({
          type: "topic under wrong unit",
          prism: { subject: "pdeu-ai", chapter: "intro", topic: "astar" },
          to: { subject: "pdeu-ai", chapter: "search" },
        }),
      ),
      EMPTY_STALE,
    );
    expect(stale.topics).toEqual({ "pdeu-ai/astar": at });
  });
});
