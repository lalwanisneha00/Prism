import { CUSTOM_PREFIX, toSubject, type CustomSubjectPayload } from "@/lib/custom/customSubject";
import { listLocalNotes } from "@/lib/notes/store";
import type { CustomSubjectRecord } from "@/lib/storage/db";
import { getAllRecords, getRecord, putRecord } from "@/lib/storage/records";
import type { Subject } from "@/lib/subjects";

/*
 * The student's own subjects, saved on the device and synced to their account (structure and
 * details only; their files and the files' text stay on the device, as for all materials).
 */

export type CustomSubjectInput = Omit<
  CustomSubjectRecord,
  "id" | "updatedAt" | "deleted" | "createdAt"
>;

export async function listCustomSubjects(): Promise<CustomSubjectRecord[]> {
  const all = await getAllRecords("customSubjects");
  return all.filter((r) => !r.deleted).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getCustomSubject(id: string): Promise<CustomSubjectRecord | undefined> {
  const r = await getRecord("customSubjects", id);
  return r && !r.deleted ? r : undefined;
}

export async function createCustomSubject(
  input: CustomSubjectInput,
  now = Date.now(),
): Promise<CustomSubjectRecord> {
  const record: CustomSubjectRecord = {
    ...input,
    id: `${CUSTOM_PREFIX}${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
    updatedAt: now,
    deleted: false,
  };
  await putRecord("customSubjects", record);
  return record;
}

export async function updateCustomSubject(
  id: string,
  change: Partial<CustomSubjectInput>,
  now = Date.now(),
): Promise<CustomSubjectRecord | undefined> {
  const current = await getCustomSubject(id);
  if (!current) return undefined;
  const next = { ...current, ...change, id, updatedAt: now };
  await putRecord("customSubjects", next);
  return next;
}

export async function duplicateCustomSubject(
  id: string,
  now = Date.now(),
): Promise<CustomSubjectRecord | undefined> {
  const current = await getCustomSubject(id);
  if (!current) return undefined;
  return createCustomSubject(
    {
      name: `${current.name} (copy)`.slice(0, 120),
      teaching: current.teaching,
      chapters: current.chapters,
      details: current.details,
      outlineFrom: current.outlineFrom,
    },
    now,
  );
}

/** Deletes the subject (a tombstone syncs, so other devices forget it too). Materials stay. */
export async function deleteCustomSubject(id: string, now = Date.now()): Promise<void> {
  const current = await getRecord("customSubjects", id);
  if (!current) return;
  await putRecord("customSubjects", { ...current, deleted: true, updatedAt: now });
}

/** Whether the student has uploaded material for the subject on this device. */
export async function hasMaterialFor(id: string): Promise<boolean> {
  const notes = await listLocalNotes().catch(() => []);
  return notes.some((n) => n.subject === id && n.chunks.length > 0);
}

export function toPayload(r: CustomSubjectRecord, hasMaterial: boolean): CustomSubjectPayload {
  return { id: r.id, name: r.name, teaching: r.teaching, hasMaterial, chapters: r.chapters };
}

/** The subject (as every feature sees it) for a stored custom subject, or undefined. */
export async function loadCustomSubject(
  id: string,
): Promise<
  { subject: Subject; payload: CustomSubjectPayload; record: CustomSubjectRecord } | undefined
> {
  const record = await getCustomSubject(id);
  if (!record || record.chapters.length === 0) return undefined;
  const payload = toPayload(record, await hasMaterialFor(id));
  return { subject: toSubject(payload), payload, record };
}
