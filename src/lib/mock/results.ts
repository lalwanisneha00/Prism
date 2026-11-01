import type { MockResult } from "@/lib/storage/db";
import { getAllRecords, putRecord } from "@/lib/storage/records";

/* Mock test results: saved on the device and synced to the student's account. */

export type MockResultInput = Omit<MockResult, "id" | "updatedAt" | "deleted" | "at">;

/** Saves a result and returns its id. */
export async function recordMockResult(input: MockResultInput, now = Date.now()): Promise<string> {
  const id = `${input.subject}_${input.chapter}@${now}`;
  await putRecord("mockResults", {
    ...input,
    id,
    at: now,
    updatedAt: now,
    deleted: false,
  });
  return id;
}

/** Mock test results, newest first. */
export async function listMockResults(): Promise<MockResult[]> {
  const all = await getAllRecords("mockResults");
  return all.filter((r) => !r.deleted).sort((a, b) => b.at - a.at);
}
