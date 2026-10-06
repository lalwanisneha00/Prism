import { z } from "zod";
import type { UniSyllabus, UniSubject } from "@/lib/university/parse";

/*
 * Optional AI help for messy syllabus files (scanned tables, two-column PDFs) that the plain reader
 * cannot follow. The AI only copies the structure it can see (semester, subject, units, topics); it is
 * told never to add anything, and its answer is checked with Zod before the student reviews it.
 */

export const AiSyllabusSchema = z.object({
  subjects: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(120),
        code: z.string().trim().max(24).optional(),
        semester: z.int().min(1).max(8).optional(),
        credits: z.number().min(0.5).max(30).optional(),
        /** The course outcomes (COs), copied as written. */
        outcomes: z.array(z.string().trim().min(6).max(400)).max(12).default([]),
        /** What could not be read ("name", "units", "outcomes"): flagged, never guessed. */
        unclear: z.array(z.string().trim().max(40)).max(6).default([]),
        units: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(160),
              topics: z.array(z.string().trim().min(1).max(160)).max(40),
            }),
          )
          .max(30)
          .default([]),
      }),
    )
    .max(80),
});

export const SYLLABUS_SYSTEM = [
  "You read a university syllabus and copy its structure into JSON. Never invent, add, rename or",
  "reorder anything: only subjects, units and topics that are written in the text.",
  'Reply with one JSON object: {"subjects":[{"name","code"?,"semester"?,"credits"?,"outcomes":[...],"unclear":[...],"units":[{"name","topics":[...]}]}]}.',
  "semester is 1 to 8 when the text says which semester a subject belongs to, otherwise leave it out.",
  "credits is a number only when the text prints it. outcomes are the course outcomes (COs) copied word for word, if listed.",
  'If something is unclear, cut off or unreadable, add its name ("name", "units" or "outcomes") to the subject\'s "unclear" list and leave it out instead of guessing.',
  "A subject is a course (it has a title, often a code). A unit is a module or chapter of that course;",
  "its topics are the items listed under it. Skip book lists and marks schemes.",
].join(" ");

/** Splits long text at line breaks into chunks the model can read (never cutting a line). */
export function chunkText(text: string, size = 12_000): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    if (current.length + line.length + 1 > size && current) {
      chunks.push(current);
      // Carry the last few lines so a subject heading is not separated from its units.
      current = current.split("\n").slice(-4).join("\n");
    }
    current += `${current ? "\n" : ""}${line}`;
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

/** Joins the answers for several chunks: the same subject (name + semester) found twice becomes one. */
export function mergeSyllabi(parts: UniSyllabus[]): UniSyllabus {
  const out = new Map<string, UniSubject>();
  for (const part of parts) {
    for (const s of part.subjects) {
      const key = `${s.name.toLowerCase()}|${s.semester ?? ""}`;
      const have = out.get(key);
      if (!have) {
        out.set(key, { ...s, units: [...s.units] });
        continue;
      }
      const names = new Set(have.units.map((u) => u.name.toLowerCase()));
      for (const u of s.units) if (!names.has(u.name.toLowerCase())) have.units.push(u);
    }
  }
  return { subjects: [...out.values()] };
}
