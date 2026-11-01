import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { listMockResults, markMockResult, recordMockResult, scoreText } from "@/lib/mock/results";
import { resetDbForTests } from "@/lib/storage/db";
import { listOutbox } from "@/lib/storage/records";
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
