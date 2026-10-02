import { z } from "zod";

/*
 * Exam worksheets (SPEC: V2 · Step 5). A practice set the AI writes for the topic, or a
 * student's own past-paper questions (PYQs) solved step by step. Like everything the AI
 * writes, a worksheet must pass this schema before it is shown.
 */

const text = z.string().trim().min(1);

export const MAX_PYQ_QUESTIONS = 10;
export const MAX_PYQ_CHARS = 1500;
export const PRACTICE_SIZES = [4, 6, 8] as const;

export const WorksheetQuestionSchema = z.object({
  question: text,
  marks: z.int().min(1).max(20),
  /** Model answer, one step per item (markdown + KaTeX). */
  steps: z.array(text).min(1).max(12),
  answer: text,
  /** What an examiner gives marks for. */
  markingPoints: z.array(text).min(1).max(8),
});
export type WorksheetQuestion = z.infer<typeof WorksheetQuestionSchema>;

export const WorksheetSchema = z.object({
  questions: z.array(WorksheetQuestionSchema).min(1).max(12),
});
export type Worksheet = z.infer<typeof WorksheetSchema>;

export const WorksheetModeSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("practice"),
    count: z.union(PRACTICE_SIZES.map((n) => z.literal(n))),
  }),
  z.object({
    mode: z.literal("pyq"),
    questions: z.array(z.string().trim().min(3).max(MAX_PYQ_CHARS)).min(1).max(MAX_PYQ_QUESTIONS),
  }),
]);
export type WorksheetMode = z.infer<typeof WorksheetModeSchema>;

export type WorksheetResponse =
  { ok: true; worksheet: Worksheet } | { ok: false; kind: string; message: string };

/** Marks earned from self-marking: full marks, half (rounded down) or none. */
export type SelfMark = "full" | "part" | "missed";

export function marksEarned(marks: number, mark: SelfMark): number {
  if (mark === "full") return marks;
  if (mark === "part") return Math.floor(marks / 2);
  return 0;
}
