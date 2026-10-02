import { getDb, type NoteSummary, type StoredNote } from "@/lib/storage/db";
import { chunkPage, searchChunks, summarize, type NoteChunk } from "@/lib/notes/retrieval";
import { getAllRecords, putRecord } from "@/lib/storage/records";

/*
 * The student's uploaded notes. Like a notebook in your own bag: the full text stays in this
 * browser. Only the file name and a short summary sync, so other devices know it exists.
 */

export const MAX_NOTE_BYTES = 30 * 1024 * 1024;

/** Stores a document's pages (already extracted) and syncs its summary. */
export async function addNote(
  file: { name: string; size: number },
  pages: string[],
  now = Date.now(),
): Promise<StoredNote> {
  const id = `note-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const chunks = pages.flatMap((text, i) =>
    chunkPage(text, { noteId: id, noteName: file.name, page: i + 1 }).map((c) => ({
      id: c.id,
      page: c.page,
      text: c.text,
    })),
  );
  const note: StoredNote = {
    id,
    name: file.name,
    size: file.size,
    pages: pages.length,
    addedAt: now,
    chunks,
  };
  await (await getDb()).put("notes", note);
  const summary: NoteSummary = {
    id,
    name: file.name,
    pages: pages.length,
    summary: summarize(pages.join(" ")),
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
