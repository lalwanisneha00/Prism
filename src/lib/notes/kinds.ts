import { docText, type ExtractedDoc } from "@/lib/extract/types";
import { tokenize } from "@/lib/notes/retrieval";
import type { Chapter } from "@/lib/subjects";
import { splitPaper } from "@/lib/worksheet/splitPaper";

/*
 * What kind of material a file is (V2.5 · Step 2). Prism guesses from the file name and its
 * contents, like sorting handouts by a glance at the first page; the student can change it.
 */

export const MATERIAL_KINDS = ["notes", "slides", "pyq", "worksheet", "syllabus"] as const;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];

export const kindLabel: Record<MaterialKind, string> = {
  notes: "Notes",
  slides: "Slides",
  pyq: "Previous-year paper",
  worksheet: "Worksheet",
  syllabus: "Syllabus",
};

export function isMaterialKind(value: unknown): value is MaterialKind {
  return typeof value === "string" && (MATERIAL_KINDS as readonly string[]).includes(value);
}

export function guessKind(name: string, doc: ExtractedDoc): MaterialKind {
  const n = name.toLowerCase().replace(/[_\-.]+/g, " ");
  if (/\b(syllabus|curriculum|course outline|scheme of (study|teaching))\b/.test(n)) {
    return "syllabus";
  }
  if (/\b(pyq|question paper|previous year|past paper|end ?sem|mid ?sem|exam paper)\b/.test(n)) {
    return "pyq";
  }
  if (/\b(worksheet|assignment|tutorial|problem set|practice sheet)\b/.test(n)) return "worksheet";

  const text = docText(doc);
  const marks = (text.match(/\(\s*\d{1,2}\s*(m|marks?)\s*\)|\[\s*\d{1,2}\s*\]/gi) ?? []).length;
  if (marks >= 3 || (splitPaper(text).length >= 5 && /\bmarks?\b/i.test(text))) return "pyq";
  if (/\b(course outcomes?|teaching hours|credits)\b/i.test(text) && /\bunit\b/i.test(text)) {
    return "syllabus";
  }
  if (doc.format === "pptx" || doc.format === "odp") return "slides";
  return "notes";
}

/**
 * The chapter a file is most about, when one clearly stands out: its words are compared
 * with each chapter's name and topic names. Undefined when it covers several chapters.
 */
export function guessChapter(chapters: readonly Chapter[], doc: ExtractedDoc): string | undefined {
  const words = tokenize(docText(doc));
  if (words.length === 0) return undefined;
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);

  // Words shared by every chapter (e.g. "law") say nothing about which chapter it is.
  const vocab = chapters.map(
    (c) => new Set(tokenize([c.name, ...c.topics.map((t) => t.name)].join(" "))),
  );
  const scores = vocab.map((v) => {
    let score = 0;
    for (const w of v) {
      const shared = vocab.filter((other) => other.has(w)).length;
      score += (counts.get(w) ?? 0) / shared;
    }
    return score;
  });
  const total = scores.reduce((a, b) => a + b, 0);
  const best = scores.indexOf(Math.max(...scores));
  return total > 0 && scores[best] >= 5 && scores[best] / total >= 0.5
    ? chapters[best].id
    : undefined;
}
