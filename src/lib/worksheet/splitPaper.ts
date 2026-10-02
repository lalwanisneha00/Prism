import { MAX_PYQ_CHARS } from "@/lib/worksheet/schema";

/*
 * Splits a pasted (or PDF-extracted) past paper into separate questions, the way you would
 * cut an exam sheet along its question numbers: "1.", "Q2", "Q.3", "4)", "Question 5".
 * Sub-parts like (a), (b) stay with their question.
 */

const QUESTION_START =
  /(?:^|\n)\s*(?:Q(?:uestion)?\s*\.?\s*(\d{1,2})\s*[.):-]?|(\d{1,2})\s*[.)])\s+(?=\S)/gi;

export function splitPaper(text: string): string[] {
  const clean = text.replace(/\r\n?/g, "\n").trim();
  if (!clean) return [];

  const starts: number[] = [];
  for (const m of clean.matchAll(QUESTION_START)) {
    // Skip a leading newline that belongs to the match.
    const offset = m[0].search(/\S/);
    starts.push(m.index + offset);
  }

  const pieces =
    starts.length >= 2
      ? starts.map((s, i) => clean.slice(s, starts[i + 1] ?? clean.length))
      : // No numbering: one question per blank-line-separated block.
        clean.split(/\n\s*\n/);

  return pieces
    .map((p) =>
      p
        .replace(/^\s*(?:Q(?:uestion)?\s*\.?\s*\d{1,2}\s*[.):-]?|\d{1,2}\s*[.)])\s*/i, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((p) => p.split(" ").length >= 3)
    .map((p) => p.slice(0, MAX_PYQ_CHARS));
}
