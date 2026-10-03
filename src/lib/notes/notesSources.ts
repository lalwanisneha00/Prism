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
  /** "slide 14", "page 3", "“Gauss's law”": shown in the citation. */
  where: z.string().trim().min(1).max(100).optional(),
  text: z.string().trim().min(1).max(MAX_PASSAGE_CHARS),
});
export type NotePassage = z.infer<typeof NotePassageSchema>;

export const NotePassagesSchema = z.array(NotePassageSchema).max(MAX_NOTE_PASSAGES);

/** Trims the best search results down to what the request may carry. */
export function toPassages(chunks: NoteChunk[]): NotePassage[] {
  return chunks.slice(0, MAX_NOTE_PASSAGES).map((c) => ({
    noteName: c.noteName.slice(0, 200),
    page: c.page,
    ...(c.where ? { where: c.where.slice(0, 100) } : {}),
    text: c.text.slice(0, MAX_PASSAGE_CHARS),
  }));
}

/** Validates passages from a request body; anything malformed means "no notes". */
export function parsePassages(value: unknown): NotePassage[] {
  const result = NotePassagesSchema.safeParse(value);
  return result.success ? result.data : [];
}

/**
 * Turns passages into citable sources: one per file and place, ids notes-1, notes-2 …
 * The title reads like "Unit 3.pptx, slide 14".
 */
export function passagesToSources(passages: NotePassage[]): GroundingSource[] {
  const byPlace = new Map<string, { noteName: string; where: string; texts: string[] }>();
  for (const p of passages) {
    const where = p.where ?? `page ${p.page}`;
    const key = `${p.noteName}\u0000${where}`;
    const entry = byPlace.get(key) ?? { noteName: p.noteName, where, texts: [] };
    entry.texts.push(p.text);
    byPlace.set(key, entry);
  }
  return [...byPlace.values()].map((e, i) => ({
    id: `notes-${i + 1}`,
    title: `${e.noteName}, ${e.where}`,
    publisher: "Your notes",
    kind: "notes",
    excerpt: e.texts.join(" … "),
  }));
}
