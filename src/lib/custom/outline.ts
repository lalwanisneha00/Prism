import { z } from "zod";
import { sectionText, type ExtractedSection } from "@/lib/extract/types";
import type { DraftChapter } from "@/lib/custom/syllabusText";

/*
 * "Outline built from your material" (V3 · Step 4): when a student gives their files but no
 * topic list, Prism proposes units and topics from the files themselves. The free version
 * needs no AI: one unit per file, topics from slide titles and headings. An AI version can
 * tidy it into a proper outline; either way the student edits it before it is saved.
 */

export type MaterialForOutline = { name: string; sections: ExtractedSection[] };

const GENERIC =
  /^(contents|index|outline|agenda|thank you|thanks|questions\??|references|summary|q ?& ?a)$/i;

function unitName(fileName: string): string {
  return (
    fileName
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "Unit"
  );
}

/** A short line that reads like a heading (not a sentence). */
function headingLike(line: string): boolean {
  const t = line.trim();
  return t.length >= 3 && t.length <= 80 && !/[.?!:;,]$/.test(t) && t.split(" ").length <= 10;
}

export function outlineFromMaterial(files: readonly MaterialForOutline[]): DraftChapter[] {
  return files
    .map((f) => {
      const topics: string[] = [];
      for (const s of f.sections) {
        const title =
          s.title ??
          s.blocks.find((b) => b.kind === "heading" || b.kind === "title")?.text ??
          (s.kind === "page" ? sectionText(s).split("\n").find(headingLike) : undefined);
        const clean = title?.replace(/\s+/g, " ").trim().slice(0, 120);
        if (clean && headingLike(clean) && !GENERIC.test(clean) && !topics.includes(clean)) {
          topics.push(clean);
        }
      }
      return { name: unitName(f.name), topics: topics.slice(0, 25) };
    })
    .filter((c) => c.topics.length > 0)
    .slice(0, 30);
}

/** What the AI sees: each section's title and opening words, kept short. */
export function outlineExcerpts(files: readonly MaterialForOutline[], maxChars = 12_000): string[] {
  const out: string[] = [];
  let used = 0;
  for (const f of files) {
    for (const s of f.sections) {
      const text = sectionText(s).replace(/\s+/g, " ").slice(0, 240);
      if (!text) continue;
      const line = `[${f.name}, ${s.label}] ${text}`;
      if (used + line.length > maxChars) return out;
      out.push(line);
      used += line.length;
    }
  }
  return out;
}

export const OutlineSchema = z.object({
  chapters: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        topics: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
      }),
    )
    .min(1)
    .max(15),
});

export function outlinePrompt(
  subjectName: string,
  excerpts: readonly string[],
  pyqs: readonly string[],
) {
  const system = `You organise a student's own study material into a syllabus outline for the subject "${subjectName}".
Rules:
- Use ONLY topics that appear in the EXCERPTS (and the previous-year questions). Never add topics from outside them.
- 3 to 10 units in a sensible teaching order, each with 2 to 12 short topic names (2-8 words, no numbering).
- Merge repeated or overlapping topics; drop slide titles that aren't topics (e.g. "Thank you", "Contents").
Reply with JSON only: {"chapters":[{"name":"...","topics":["...","..."]}]}`;
  const prompt = `EXCERPTS (file, part, text):
${excerpts.join("\n")}
${pyqs.length ? `\nPREVIOUS-YEAR QUESTIONS:\n${pyqs.map((q) => `- ${q}`).join("\n")}` : ""}`;
  return { system, prompt };
}
