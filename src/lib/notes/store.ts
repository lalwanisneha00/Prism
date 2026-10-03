import { sectionText, type ExtractedDoc, type ExtractedSection } from "@/lib/extract/types";
import type { MaterialKind } from "@/lib/notes/kinds";
import { chunkPage, searchChunks, summarize, type NoteChunk } from "@/lib/notes/retrieval";
import { getDb, type NoteFile, type NoteSummary, type StoredNote } from "@/lib/storage/db";
import { getAllRecords, putRecord } from "@/lib/storage/records";

/*
 * The student's uploaded materials. Like a notebook in your own bag: the full text (and the
 * original file) stays in this browser. Only the file name, its kind and subject, and a short
 * summary sync, so other devices know it exists.
 */

export type NoteMeta = { kind?: MaterialKind; subject?: string; chapter?: string };

/** Originals larger than this aren't kept (their text still is); OCR then needs a re-upload. */
export const MAX_KEPT_FILE_BYTES = 15 * 1024 * 1024;

/** Search passages for the sections the student kept (removed parts are left out). */
export function buildChunks(note: Pick<StoredNote, "id" | "name" | "sections" | "excluded">) {
  const excluded = new Set(note.excluded ?? []);
  return (note.sections ?? [])
    .filter((s) => !excluded.has(s.index))
    .flatMap((section) =>
      chunkPage(sectionText(section), {
        noteId: note.id,
        noteName: note.name,
        page: section.index,
        where: section.label,
      }).map((c) => ({ id: c.id, page: c.page, where: c.where, text: c.text })),
    );
}

function summaryOf(note: StoredNote, now: number): NoteSummary {
  const excluded = new Set(note.excluded ?? []);
  const text = (note.sections ?? [])
    .filter((s) => !excluded.has(s.index))
    .map(sectionText)
    .join(" ");
  return {
    id: note.id,
    name: note.name,
    pages: note.pages,
    summary: summarize(text),
    updatedAt: now,
    deleted: false,
    ...(note.kind ? { kind: note.kind } : {}),
    ...(note.subject ? { subject: note.subject } : {}),
    ...(note.chapter ? { chapter: note.chapter } : {}),
  };
}

/** Stores a file (already read into sections on this device) and syncs its summary. */
export async function addNote(
  file: { name: string; size: number },
  doc: ExtractedDoc,
  now = Date.now(),
  meta: NoteMeta = {},
  original?: { bytes: ArrayBuffer; mime: string },
): Promise<StoredNote> {
  const id = `note-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const base = { id, name: file.name, sections: doc.sections, excluded: [] };
  const note: StoredNote = {
    ...base,
    size: file.size,
    pages: doc.sections.length,
    addedAt: now,
    chunks: buildChunks(base),
    format: doc.format,
    warnings: doc.warnings,
    ...meta,
  };
  const db = await getDb();
  await db.put("notes", note);
  if (original && original.bytes.byteLength <= MAX_KEPT_FILE_BYTES) {
    await db.put("noteFiles", { id, ...original });
  }
  await putRecord("noteSummaries", summaryOf(note, now));
  return note;
}

export async function getNote(id: string): Promise<StoredNote | undefined> {
  return (await getDb()).get("notes", id);
}

export async function getNoteFile(id: string): Promise<NoteFile | undefined> {
  return (await getDb()).get("noteFiles", id);
}

/** Saves a changed note, rebuilding its search passages, and syncs the new summary. */
async function saveNote(note: StoredNote, now: number): Promise<StoredNote> {
  const next = { ...note, chunks: buildChunks(note) };
  await (await getDb()).put("notes", next);
  await putRecord("noteSummaries", summaryOf(next, now));
  return next;
}

/** Re-tags a file: its kind, subject or chapter. */
export async function updateNoteMeta(
  id: string,
  meta: NoteMeta,
  now = Date.now(),
): Promise<StoredNote | undefined> {
  const note = await getNote(id);
  if (!note) return undefined;
  const next: StoredNote = { ...note, ...meta };
  // A chapter only makes sense inside its subject.
  if (meta.subject !== undefined && meta.subject !== note.subject && meta.chapter === undefined) {
    delete next.chapter;
  }
  for (const key of ["kind", "subject", "chapter"] as const) {
    if (next[key] === "" || next[key] === undefined) delete next[key];
  }
  return saveNote(next, now);
}

/** Keeps or removes one section (slide, page…) from what lessons use. */
export async function setSectionIncluded(
  id: string,
  index: number,
  included: boolean,
  now = Date.now(),
): Promise<StoredNote | undefined> {
  const note = await getNote(id);
  if (!note) return undefined;
  const excluded = new Set(note.excluded ?? []);
  if (included) excluded.delete(index);
  else excluded.add(index);
  return saveNote({ ...note, excluded: [...excluded].sort((a, b) => a - b) }, now);
}

/** Stores text read from a section's pictures, so lessons can use it. */
export async function setSectionOcr(
  id: string,
  index: number,
  text: string,
  source: "device" | "ai",
  now = Date.now(),
): Promise<StoredNote | undefined> {
  const note = await getNote(id);
  if (!note?.sections) return undefined;
  const sections = note.sections.map((s): ExtractedSection =>
    s.index === index
      ? { ...s, ocrText: text.trim(), ocr: source, thin: !text.trim() && s.thin }
      : s,
  );
  return saveNote({ ...note, sections }, now);
}

/** Notes whose text is on this device, newest first. */
export async function listLocalNotes(): Promise<StoredNote[]> {
  const notes = await (await getDb()).getAll("notes");
  return notes.sort((a, b) => b.addedAt - a.addedAt);
}

/** Notes uploaded on another device: known by name only, their text isn't here. */
export async function listRemoteOnlyNotes(): Promise<NoteSummary[]> {
  const local = new Set((await listLocalNotes()).map((n) => n.id));
  const summaries = await getAllRecords("noteSummaries");
  return summaries
    .filter((s) => !s.deleted && !local.has(s.id))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteNote(id: string, now = Date.now()): Promise<void> {
  const db = await getDb();
  await db.delete("notes", id);
  await db.delete("noteFiles", id);
  const summary = (await getAllRecords("noteSummaries")).find((s) => s.id === id);
  await putRecord("noteSummaries", {
    id,
    name: summary?.name ?? "",
    pages: summary?.pages ?? 0,
    summary: "",
    updatedAt: now,
    deleted: true,
  });
}

/**
 * The passages of local notes that best match a lesson topic. With a subject, notes tagged
 * for another subject are skipped (untagged notes are used for every subject).
 */
export async function findRelevantPassages(
  query: string,
  limit = 8,
  subject?: string,
): Promise<NoteChunk[]> {
  const notes = (await listLocalNotes()).filter(
    (n) => !subject || !n.subject || n.subject === subject,
  );
  const chunks = notes.flatMap((n) =>
    n.chunks.map((c) => ({ ...c, noteId: n.id, noteName: n.name })),
  );
  return searchChunks(chunks, query, limit);
}
