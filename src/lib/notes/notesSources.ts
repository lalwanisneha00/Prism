import { z } from "zod";
import type { NoteChunk } from "@/lib/notes/retrieval";
import type { GroundingSource } from "@/lib/prompts/lessonPrompt";

/*
 * The few passages of a student's notes that are sent with a lesson request. The browser
 * picks them (the full file never leaves the device); the server checks their shape and
 * size before they go into the prompt.
 */

export const MAX_NOTE_PASSAGES = 8;
export const MAX_PASSAGE_CHARS = 1200;

export const NotePassageSchema = z.object({
  noteName: z.string().trim().min(1).max(200),
  page: z.int().positive().max(5000),
  text: z.string().trim().min(1).max(MAX_PASSAGE_CHARS),
});
export type NotePassage = z.infer<typeof NotePassageSchema>;

export const NotePassagesSchema = z.array(NotePassageSchema).max(MAX_NOTE_PASSAGES);

/** Trims the best search results down to what the request may carry. */
export function toPassages(chunks: NoteChunk[]): NotePassage[] {
  return chunks.slice(0, MAX_NOTE_PASSAGES).map((c) => ({
    noteName: c.noteName.slice(0, 200),
    page: c.page,
    text: c.text.slice(0, MAX_PASSAGE_CHARS),
  }));
}

/** Validates passages from a request body; anything malformed means "no notes". */
export function parsePassages(value: unknown): NotePassage[] {
  const result = NotePassagesSchema.safeParse(value);
  return result.success ? result.data : [];
}

/** Turns passages into citable sources: one per file and page, ids notes-1, notes-2 … */
export function passagesToSources(passages: NotePassage[]): GroundingSource[] {
  const byPage = new Map<string, { noteName: string; page: number; texts: string[] }>();
  for (const p of passages) {
    const key = `${p.noteName}\u0000${p.page}`;
    const entry = byPage.get(key) ?? { noteName: p.noteName, page: p.page, texts: [] };
    entry.texts.push(p.text);
    byPage.set(key, entry);
  }
  return [...byPage.values()].map((e, i) => ({
    id: `notes-${i + 1}`,
    title: `${e.noteName}, page ${e.page}`,
    publisher: "Your notes",
    kind: "notes",
    excerpt: e.texts.join(" … "),
  }));
}
