import { sectionText, type ExtractedDoc } from "@/lib/extract/types";
import { getDb, type NoteSummary, type StoredNote } from "@/lib/storage/db";
import { chunkPage, searchChunks, summarize, type NoteChunk } from "@/lib/notes/retrieval";
import { getAllRecords, putRecord } from "@/lib/storage/records";

/*
 * The student's uploaded notes. Like a notebook in your own bag: the full text stays in this
 * browser. Only the file name and a short summary sync, so other devices know it exists.
 */

/** Stores a file (already read into sections on this device) and syncs its summary. */
export async function addNote(
  file: { name: string; size: number },
  doc: ExtractedDoc,
  now = Date.now(),
): Promise<StoredNote> {
  const id = `note-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const texts = doc.sections.map(sectionText);
  const chunks = doc.sections.flatMap((section, i) =>
    chunkPage(texts[i], {
      noteId: id,
      noteName: file.name,
      page: section.index,
      where: section.label,
    }).map((c) => ({ id: c.id, page: c.page, where: c.where, text: c.text })),
  );
  const note: StoredNote = {
    id,
    name: file.name,
    size: file.size,
    pages: doc.sections.length,
    addedAt: now,
    chunks,
    format: doc.format,
    sections: doc.sections,
    warnings: doc.warnings,
  };
  await (await getDb()).put("notes", note);
  const summary: NoteSummary = {
    id,
    name: file.name,
    pages: doc.sections.length,
    summary: summarize(texts.join(" ")),
    updatedAt: now,
    deleted: false,
  };
  await putRecord("noteSummaries", summary);
  return note;
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
  await (await getDb()).delete("notes", id);
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

/** The passages of all local notes that best match a lesson topic. */
export async function findRelevantPassages(query: string, limit = 8): Promise<NoteChunk[]> {
  const notes = await listLocalNotes();
  const chunks = notes.flatMap((n) =>
    n.chunks.map((c) => ({ ...c, noteId: n.id, noteName: n.name })),
  );
  return searchChunks(chunks, query, limit);
}
