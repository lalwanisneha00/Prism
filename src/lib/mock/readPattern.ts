import { z } from "zod";
import {
  PaperPatternSchema,
  patternMarks,
  QUESTION_TYPES,
  type PaperPattern,
  type PatternSection,
  type QuestionType,
} from "@/lib/mock/pattern";
import { splitPaper } from "@/lib/worksheet/splitPaper";

/*
 * Reading a paper's pattern (mock test overhaul). The AI reads each chunk of a long paper and
 * lists what it sees (sections, choice, each question's marks and type); plain code then joins
 * the chunks into one pattern, so a mistake in one chunk can't change the arithmetic. When the
 * AI can't be reached, a free rule-based reader does the same from the paper's own text.
 */

/** Text sent to the AI in one go: about one long exam paper. */
export const PATTERN_CHUNK_CHARS = 12_000;
/** Longest paper text read (longer files are cut). */
export const MAX_PAPER_CHARS = 60_000;

/** What the AI returns for one chunk of a paper. */
export const PatternExtractionSchema = z.object({
  totalMarks: z.number().positive().max(300).optional(),
  minutes: z.int().positive().max(360).optional(),
  sections: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        instructions: z.string().trim().max(200).optional(),
        attempt: z.int().positive().max(40).optional(),
        questions: z
          .array(
            z.object({
              marks: z.number().positive().max(100),
              type: z.enum(QUESTION_TYPES),
              /** The question's first words (for style and topic counts). */
              text: z.string().trim().max(200).default(""),
            }),
          )
          .max(40),
      }),
    )
    .max(10),
});
export type PatternExtraction = z.infer<typeof PatternExtractionSchema>;

/** Cuts a paper into chunks at line breaks, each at most `size` characters. */
export function chunkPaper(text: string, size = PATTERN_CHUNK_CHARS): string[] {
  const clean = text.replace(/\r\n?/g, "\n").trim().slice(0, MAX_PAPER_CHARS);
  if (!clean) return [];
  const chunks: string[] = [];
  let rest = clean;
  while (rest.length > size) {
    const cut = rest.lastIndexOf("\n", size);
    const at = cut > size * 0.5 ? cut : size;
    chunks.push(rest.slice(0, at).trim());
    rest = rest.slice(at);
  }
  if (rest.trim()) chunks.push(rest.trim());
  return chunks;
}

const sectionKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Joins the chunks' readings into one pattern (sections with the same name are merged). */
export function patternFromExtractions(
  parts: readonly PatternExtraction[],
  now: number,
): PaperPattern | undefined {
  const sections: PatternSection[] = [];
  const byKey = new Map<string, PatternSection>();
  const samples: string[] = [];
  for (const part of parts) {
    for (const s of part.sections) {
      const questions = s.questions.map((q) => ({ type: q.type, marks: q.marks }));
      samples.push(...s.questions.map((q) => q.text).filter(Boolean));
      if (questions.length === 0) continue;
      const key = sectionKey(s.name);
      const known = byKey.get(key);
      if (known) {
        known.questions.push(...questions);
        known.attempt ??= s.attempt;
        known.instructions ??= s.instructions;
        continue;
      }
      const section: PatternSection = {
        name: s.name,
        ...(s.instructions ? { instructions: s.instructions } : {}),
        ...(s.attempt ? { attempt: s.attempt } : {}),
        questions,
      };
      byKey.set(key, section);
      sections.push(section);
    }
  }
  for (const s of sections) {
    s.questions = s.questions.slice(0, 40);
    if (s.attempt && s.attempt >= s.questions.length) delete s.attempt;
  }
  const kept = sections.slice(0, 10);
  if (kept.length === 0) return undefined;
  const minutes = parts.find((p) => p.minutes)?.minutes;
  const pattern = {
    version: 1 as const,
    totalMarks: patternMarks({ sections: kept }),
    ...(minutes ? { minutes } : {}),
    sections: kept,
    samples: [...new Set(samples.map((t) => t.slice(0, 200)))].slice(0, 30),
    source: "ai" as const,
    analysedAt: now,
  };
  return PaperPatternSchema.safeParse(pattern).data;
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

/** "attempt any four", "answer any 3 questions" → 4, 3. */
function choiceIn(text: string): number | undefined {
  const m =
    /\b(?:attempt|answer|solve)\s+any\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.exec(
      text,
    );
  if (!m) return undefined;
  const n = Number(m[1]) || WORD_NUMBERS[m[1].toLowerCase()];
  return n > 0 ? n : undefined;
}

/** The marks written next to a question: "(5)", "[5 marks]", "5M", "(05 Marks)". */
export function marksIn(question: string): number | undefined {
  const m =
    /[([]\s*(\d{1,2})\s*(?:m|marks?)?\s*[)\]]\s*$/i.exec(question) ??
    /\b(\d{1,2})\s*(?:m|marks)\b/i.exec(question) ??
    /[([]\s*(\d{1,2})\s*(?:m|marks?)?\s*[)\]]/i.exec(question);
  const n = m ? Number(m[1]) : NaN;
  return n > 0 && n <= 50 ? n : undefined;
}

/** A question's type from its wording and marks. */
export function guessType(question: string, marks: number): QuestionType {
  const q = question.toLowerCase();
  if (/(?:^|\s)\(?[a-d][).]\s+\S[\s\S]*\(?[b-d][).]\s+\S/.test(q) && marks <= 2) return "mcq";
  if (/\b(derive|derivation|prove that|show that)\b/.test(q)) return "derivation";
  if (/\b(draw|sketch|diagram|neat figure|labelled)\b/.test(q)) return "diagram";
  if (/\b(calculate|compute|determine|find the|evaluate|estimate)\b/.test(q) && /\d/.test(q))
    return "numerical";
  return marks <= 3 ? "short" : "long";
}

/** The free reader: sections from "Section/Part A" headings, marks from the brackets. */
export function rulePattern(text: string, now: number): PaperPattern | undefined {
  const clean = text.replace(/\r\n?/g, "\n").slice(0, MAX_PAPER_CHARS);
  const heading = /(?:^|\n)\s*((?:section|part)\s*[-–:]?\s*(?:[A-E]|I{1,3}|IV|V|\d))\b[^\n]*/gi;
  const marks: { name: string; at: number; line: string }[] = [];
  for (const m of clean.matchAll(heading)) {
    marks.push({ name: m[1].replace(/\s+/g, " ").trim(), at: m.index, line: m[0] });
  }
  const pieces =
    marks.length > 0
      ? marks.map((h, i) => ({
          name: h.name.replace(/^./, (c) => c.toUpperCase()),
          head: h.line,
          body: clean.slice(h.at + h.line.length, marks[i + 1]?.at ?? clean.length),
        }))
      : [{ name: "Section A", head: "", body: clean }];

  const total = /max(?:imum)?\.?\s*marks?\s*[:\-–]?\s*(\d{2,3})/i.exec(clean);
  const hours = /(?:time|duration)\s*[:\-–]?\s*(\d(?:\.\d)?)\s*(?:hours?|hrs?)/i.exec(clean);
  const mins = /(?:time|duration)\s*[:\-–]?\s*(\d{2,3})\s*(?:minutes?|mins?)/i.exec(clean);
  const minutes = hours ? Math.round(Number(hours[1]) * 60) : mins ? Number(mins[1]) : undefined;

  const samples: string[] = [];
  const sections: PatternSection[] = [];
  for (const p of pieces) {
    const questions = splitPaper(p.body);
    if (questions.length === 0) continue;
    const found = questions.map((q) => marksIn(q));
    // Unmarked questions take the section's usual marks (or 5 when nothing is written).
    const known = found.filter((m): m is number => m !== undefined);
    const fallback = known.length ? known.sort((a, b) => a - b)[Math.floor(known.length / 2)] : 5;
    const attempt = choiceIn(p.head) ?? choiceIn(p.body.slice(0, 300));
    sections.push({
      name: p.name.slice(0, 80),
      ...(attempt && attempt < questions.length ? { attempt } : {}),
      questions: questions.slice(0, 40).map((q, i) => {
        const m = found[i] ?? fallback;
        return { type: guessType(q, m), marks: m };
      }),
    });
    samples.push(...questions.map((q) => q.slice(0, 200)));
  }
  if (sections.length === 0) return undefined;
  const kept = sections.slice(0, 10);
  const pattern = {
    version: 1 as const,
    totalMarks: total ? Number(total[1]) : patternMarks({ sections: kept }),
    ...(minutes && minutes <= 360 ? { minutes } : {}),
    sections: kept,
    samples: [...new Set(samples)].slice(0, 30),
    source: "rules" as const,
    analysedAt: now,
  };
  // The paper's stated maximum wins only when it matches what was read; otherwise the count does.
  if (Math.abs(pattern.totalMarks - patternMarks({ sections: kept })) > 0)
    pattern.totalMarks = patternMarks({ sections: kept });
  return PaperPatternSchema.safeParse(pattern).data;
}

export function patternPrompt(
  chunk: string,
  part: number,
  of: number,
): {
  system: string;
  prompt: string;
} {
  const system = `You read a university exam paper and describe its STRUCTURE only.
Rules:
- List the paper's sections (e.g. "Section A", "Part B", "Q1"; use "Section A" when there are none) in order.
- For each section: "instructions" (short, e.g. "Answer any 4"), "attempt" (how many questions the student must answer when there is a choice; omit when all are compulsory), and every question with its "marks", "type" and "text" (the first 15 words of the question).
- "type" is one of: mcq (options to pick from), short (definitions, short answers, up to ~4 marks), long (explanations, essays), numerical (calculations), derivation (derive / prove / show that), diagram (draw / sketch).
- A question with parts (a), (b) counts as one question with the marks added up, unless the parts are separate choices.
- "totalMarks" and "minutes" only when the paper states them.
- Never invent questions that are not on the paper.
Reply with JSON only: {"totalMarks":100,"minutes":180,"sections":[{"name":"Section A","instructions":"Answer all","questions":[{"marks":1,"type":"mcq","text":"..."}]}]}`;
  const prompt = `${of > 1 ? `This is part ${part} of ${of} of one paper. Use the section names exactly as printed so the parts can be joined.\n\n` : ""}PAPER:\n${chunk}`;
  return { system, prompt };
}
