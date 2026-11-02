import { z } from "zod";
import cProgramming from "@/data/mockChecklists/c-programming.json";

/*
 * Subject checklists for the mock paper's examiner. Each is a small data file
 * (`src/data/mockChecklists/*.json`) listing the mistakes a strict examiner of that subject looks
 * for. Only the matching subject's checklist is added to the examiner's prompt, so other subjects
 * pay nothing for it. To add a subject: write its JSON file and list it in CHECKLISTS.
 */

export const ChecklistSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  match: z.object({
    /** Lower-case phrases; the subject matches when its name contains one. */
    subjectNames: z.array(z.string().min(1)).default([]),
    /** Lower-case phrases; the subject matches when one of its topic names contains one. */
    topicNames: z.array(z.string().min(1)).default([]),
  }),
  /** What doesn't belong in this subject's papers (for the syllabus check). */
  offTopic: z.string().default(""),
  areas: z
    .array(z.object({ area: z.string().min(1), rules: z.array(z.string().min(1)).min(1) }))
    .min(1),
});
export type Checklist = z.infer<typeof ChecklistSchema>;

export const CHECKLISTS: readonly Checklist[] = [cProgramming].map((c) => ChecklistSchema.parse(c));

/** Whole-word match, so "c program" doesn't match "basic programming". */
function contains(text: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(text);
}

/** The checklist for a subject (by its name or its topic names), if there is one. */
export function checklistFor(
  subject: { name: string; topicNames: readonly string[] },
  lists: readonly Checklist[] = CHECKLISTS,
): Checklist | undefined {
  const name = subject.name.toLowerCase();
  const topics = subject.topicNames.map((t) => t.toLowerCase());
  return lists.find(
    (c) =>
      c.match.subjectNames.some((p) => contains(name, p)) ||
      c.match.topicNames.some((p) => topics.some((t) => contains(t, p))),
  );
}

/** The checklist as prompt text. */
export function checklistText(c: Checklist): string {
  return [
    `${c.name.toUpperCase()} CHECKLIST (check every question and answer against these):`,
    ...(c.offTopic ? [`- Off-syllabus: ${c.offTopic}`] : []),
    ...c.areas.flatMap((a) => [`${a.area}:`, ...a.rules.map((r) => `- ${r}`)]),
  ].join("\n");
}
