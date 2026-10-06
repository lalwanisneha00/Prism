import { z } from "zod";

/*
 * Course outcomes (COs) from the student's own syllabus set the depth and emphasis of THEIR
 * lessons. The browser sends the outcomes with the lesson request; the server checks them here
 * (never trusted as-is), adds them to the prompt, and treats the lesson as personal (never shared).
 */

export const EmphasisSchema = z.object({
  subjectName: z.string().trim().min(1).max(160),
  outcomes: z.array(z.string().trim().min(1).max(400)).min(1).max(8),
});
export type Emphasis = z.infer<typeof EmphasisSchema>;

/** The checked emphasis from a request body, or null. */
export function parseEmphasis(value: unknown): Emphasis | null {
  const r = EmphasisSchema.safeParse(value);
  return r.success ? r.data : null;
}

/** The prompt section for the student's course outcomes. */
export function emphasisRule(e: Emphasis | null | undefined): string {
  if (!e) return "";
  return `
THE STUDENT'S COURSE OUTCOMES (from their own university syllabus, "${e.subjectName}"):
${e.outcomes.map((o, i) => `- CO${i + 1}: ${o}`).join("\n")}
- Set the depth and emphasis of the lesson by these outcomes: spend more time on the skills they ask for (for example "apply", "analyse", "evaluate"), and let the worked examples and quiz questions practise them.
- Do not mention the course outcomes by number in the lesson text, and do not add content just because an outcome exists.
`;
}
