import type { AppSettings, AudioPosition, QuizAttempt } from "@/lib/storage/db";
import { getDb } from "@/lib/storage/db";
import { getRecord, putRecord } from "@/lib/storage/records";

/* Quiz results, audio resume positions and settings: all synced per student. */

export type QuizResultInput = Omit<QuizAttempt, "id" | "updatedAt" | "deleted" | "at">;

export async function recordQuizAttempt(input: QuizResultInput, now = Date.now()): Promise<void> {
  await putRecord("quizAttempts", {
    ...input,
    id: `${input.lessonId}@${now}`,
    at: now,
    updatedAt: now,
    deleted: false,
  });
}

/** Quiz attempts, newest first. */
export async function listQuizAttempts(): Promise<QuizAttempt[]> {
  const all = await (await getDb()).getAllFromIndex("quizAttempts", "byAt");
  return all.filter((a) => !a.deleted).reverse();
}

/**
 * Topics to revise: each topic's most recent quiz score, kept when it is below the bar.
 * Weakest first.
 */
export function weakTopics(attempts: QuizAttempt[], threshold = 0.6): QuizAttempt[] {
  const latest = new Map<string, QuizAttempt>();
  for (const a of attempts) {
    const prev = latest.get(a.topic);
    if (!prev || a.at > prev.at) latest.set(a.topic, a);
  }
  return [...latest.values()]
    .filter((a) => a.total > 0 && a.score / a.total < threshold)
    .sort((a, b) => a.score / a.total - b.score / b.total);
}

export async function saveAudioPosition(
  id: string,
  title: string,
  seconds: number,
  now = Date.now(),
): Promise<void> {
  const existing = await getRecord("audioPositions", id);
  // Skip tiny changes: no need to sync a position that barely moved.
  if (existing && !existing.deleted && Math.abs(existing.seconds - seconds) < 2) return;
  const record: AudioPosition = { id, title, seconds, updatedAt: now, deleted: false };
  await putRecord("audioPositions", record);
}

export async function getAudioPosition(id: string): Promise<AudioPosition | undefined> {
  const record = await getRecord("audioPositions", id);
  return record && !record.deleted ? record : undefined;
}

export async function listAudioPositions(): Promise<AudioPosition[]> {
  const all = await (await getDb()).getAll("audioPositions");
  return all.filter((p) => !p.deleted).sort((a, b) => b.updatedAt - a.updatedAt);
}

const SETTINGS_ID = "app";

export async function getSettings(): Promise<AppSettings | undefined> {
  return getRecord("settings", SETTINGS_ID);
}

export async function updateSettings(
  changes: Partial<
    Pick<AppSettings, "theme" | "audioRate" | "branch" | "semester" | "importanceOverrides">
  >,
  now = Date.now(),
): Promise<void> {
  const current = await getSettings();
  await putRecord("settings", {
    ...(current ?? { id: SETTINGS_ID, deleted: false }),
    ...changes,
    id: SETTINGS_ID,
    updatedAt: now,
    deleted: false,
  });
}
