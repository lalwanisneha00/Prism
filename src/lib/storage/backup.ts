import { z } from "zod";
import { parseLesson } from "@/lib/schema";
import { SYNCED_COLLECTIONS, type SyncedCollection, type SyncedRecords } from "@/lib/storage/db";
import { recordSchemas, syncFields } from "@/lib/storage/recordSchemas";
import { getAllRecords, getRecord, putRecord } from "@/lib/storage/records";

/*
 * Export / import backup (SPEC §9.6): a JSON file with everything on this device.
 * The safety net for guests, and for anyone who wants their own copy.
 */

export const BACKUP_APP = "prism";
export const BACKUP_VERSION = 2;

export type Backup = {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  collections: { [C in SyncedCollection]: SyncedRecords[C][] };
};

export async function exportBackup(now = new Date()): Promise<Backup> {
  const collections = {} as Backup["collections"];
  for (const c of SYNCED_COLLECTIONS) {
    const records = await getAllRecords(c);
    // API keys travel with the account, never in a file that could be shared by mistake.
    (collections as Record<string, unknown>)[c] =
      c === "settings"
        ? (records as object[]).map((r) =>
            Object.fromEntries(Object.entries(r).filter(([k]) => k !== "apiKeys")),
          )
        : records;
  }
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), collections };
}

const SavedSchema = z.object({
  ...syncFields,
  savedAt: z.number(),
  libraryKey: z.string().optional(),
  lesson: z.unknown(),
});

export type ImportResult = { added: number; updated: number; skipped: number };

/**
 * Merges a backup into this device: newer records win, invalid ones are skipped, and every
 * change is queued so it syncs if the student is signed in.
 */
export async function importBackup(data: unknown): Promise<ImportResult> {
  const head = z
    .object({
      app: z.literal(BACKUP_APP),
      version: z.number(),
      collections: z.record(z.string(), z.unknown()),
    })
    .safeParse(data);
  if (!head.success) throw new Error("This file isn't a Prism backup.");

  const result: ImportResult = { added: 0, updated: 0, skipped: 0 };
  for (const c of SYNCED_COLLECTIONS) {
    const items = head.data.collections[c];
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const record = validate(c, item);
      if (!record) {
        result.skipped++;
        continue;
      }
      const existing = await getRecord(c, record.id);
      if (existing && existing.updatedAt >= record.updatedAt) {
        result.skipped++;
        continue;
      }
      await putRecord(c, record);
      result[existing ? "updated" : "added"]++;
    }
  }
  return result;
}

function validate<C extends SyncedCollection>(c: C, item: unknown): SyncedRecords[C] | null {
  if (c === "savedLessons") {
    const saved = SavedSchema.safeParse(item);
    if (!saved.success) return null;
    const lesson = parseLesson(saved.data.lesson);
    return lesson.ok ? ({ ...saved.data, lesson: lesson.lesson } as SyncedRecords[C]) : null;
  }
  const parsed = recordSchemas[c as Exclude<C, "savedLessons">].safeParse(item);
  return parsed.success ? (parsed.data as SyncedRecords[C]) : null;
}
