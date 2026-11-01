import type { MockResult } from "@/lib/storage/db";
import { getAllRecords, getRecord, putRecord } from "@/lib/storage/records";

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

/**
 * Adds the student's own total to a saved paper (saved unmarked at Finish). False when the
 * record is gone (deleted on another device).
 */
export async function markMockResult(
  id: string,
  score: number,
  now = Date.now(),
): Promise<boolean> {
  const saved = await getRecord("mockResults", id);
  if (!saved || saved.deleted) return false;
  const marked = { ...saved, score, updatedAt: now };
  delete marked.unmarked;
  await putRecord("mockResults", marked);
  return true;
}

/** A score to show: "not marked" for a paper saved without the student's total. */
export const scoreText = (r: Pick<MockResult, "score" | "total" | "unmarked">) =>
  r.unmarked ? "not marked" : `${r.score}/${r.total}`;

/** Mock test results, newest first. */
export async function listMockResults(): Promise<MockResult[]> {
  const all = await getAllRecords("mockResults");
  return all.filter((r) => !r.deleted).sort((a, b) => b.at - a.at);
}
