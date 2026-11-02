import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteMockResults,
  listMockResults,
  markMockResult,
  recordMockResult,
  restoreMockResults,
  scoreText,
} from "@/lib/mock/results";
import { resetDbForTests } from "@/lib/storage/db";
import { getRecord, listOutbox } from "@/lib/storage/records";
import { recordSchemas } from "@/lib/storage/recordSchemas";

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDbForTests();
});

describe("mock test results", () => {
  it("are saved, listed newest first and queued for sync in a valid shape", async () => {
    const base = {
      subject: "em",
      chapter: "electrostatics",
      level: "exam-prep",
      minutes: 30,
      title: "Electrostatics",
      total: 30,
      byTopic: [{ topic: "gauss-law", score: 4, total: 6 }],
    };
    await recordMockResult({ ...base, score: 18 }, 1000);
    await recordMockResult({ ...base, score: 24 }, 2000);
    const results = await listMockResults();
    expect(results.map((r) => r.score)).toEqual([24, 18]);
    expect((await listOutbox()).map((e) => e.collection)).toEqual(["mockResults", "mockResults"]);
    expect(recordSchemas.mockResults.safeParse(results[0]).success).toBe(true);
  });

  it("a paper skipped without marks stays saved as 'not marked', and marks can be added to it", async () => {
    const id = await recordMockResult(
      {
        subject: "em",
        chapter: "multiple",
        level: "exam-prep",
        minutes: 45,
        title: "Unit 1",
        score: 0,
        unmarked: true,
        total: 20,
        byTopic: [],
        mode: "paper",
        timeTakenSec: 600,
      },
      1000,
    );
    let [saved] = await listMockResults();
    expect(saved.id).toBe(id);
    expect(scoreText(saved)).toBe("not marked");
    expect(recordSchemas.mockResults.safeParse(saved).success).toBe(true);

    expect(await markMockResult(id, 12.5, 2000)).toBe(true);
    [saved] = await listMockResults();
    expect(saved.unmarked).toBeUndefined();
    expect(scoreText(saved)).toBe("12.5/20");
    expect(await listMockResults()).toHaveLength(1);
    expect(await markMockResult("missing", 3)).toBe(false);
  });
});

describe("deleting mocks", () => {
  const base = {
    subject: "em",
    chapter: "electrostatics",
    level: "exam-prep",
    minutes: 30,
    title: "Electrostatics",
    total: 30,
    score: 20,
    byTopic: [],
  };

  it("hides a deleted mock and queues the tombstone for sync, so it goes on every device", async () => {
    const a = await recordMockResult(base, 1000);
    const b = await recordMockResult(base, 2000);
    await deleteMockResults([a], 3000);
    expect((await listMockResults()).map((r) => r.id)).toEqual([b]);
    expect(await getRecord("mockResults", a)).toMatchObject({ deleted: true, updatedAt: 3000 });
    const queued = (await listOutbox()).filter((e) => e.collection === "mockResults");
    expect(queued.map((e) => e.id)).toContain(a);
  });

  it("undo brings it back with a newer write, so the undo wins when syncing", async () => {
    const a = await recordMockResult(base, 1000);
    await deleteMockResults([a], 3000);
    await restoreMockResults([a], 4000);
    const back = await listMockResults();
    expect(back.map((r) => r.id)).toEqual([a]);
    expect(back[0].updatedAt).toBe(4000);
  });

  it("deletes several at once and ignores unknown ids", async () => {
    const a = await recordMockResult(base, 1000);
    const b = await recordMockResult(base, 2000);
    await deleteMockResults([a, b, "nope"], 3000);
    expect(await listMockResults()).toEqual([]);
  });
});
