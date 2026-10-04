import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { listMockResults, recordMockResult } from "@/lib/mock/results";
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
});
