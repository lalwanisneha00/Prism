import type { MockResult } from "@/lib/storage/db";
import { getAllRecords, putRecord } from "@/lib/storage/records";

/* Mock test results: saved on the device and synced to the student's account. */

export type MockResultInput = Omit<MockResult, "id" | "updatedAt" | "deleted" | "at">;

export async function recordMockResult(input: MockResultInput, now = Date.now()): Promise<void> {
  await putRecord("mockResults", {
    ...input,
    id: `${input.subject}_${input.chapter}@${now}`,
    at: now,
    updatedAt: now,
    deleted: false,
  });
}

/** Mock test results, newest first. */
export async function listMockResults(): Promise<MockResult[]> {
  const all = await getAllRecords("mockResults");
  return all.filter((r) => !r.deleted).sort((a, b) => b.at - a.at);
}
