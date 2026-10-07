import type { Subject } from "@/lib/subjects";

/*
 * Elective slots ("Program Elective 1", "Open Elective 2"): the student picks one option per slot.
 * An option's course key looks like "<slot key>--<option>", so the slot is the part before "--".
 * The choice is saved in the student's synced settings as "<branch>/<slot key>" → option key.
 */

export type ElectiveChoices = Record<string, string>;

export const slotKeyOf = (courseKey: string): string | null =>
  courseKey.includes("--") ? courseKey.split("--")[0] : null;

export const choiceId = (branch: string, slotKey: string): string => `${branch}/${slotKey}`;

/** The subjects a student studies in a semester: every course, and only the chosen option of each elective slot. */
export function visibleSubjects(
  list: readonly Subject[],
  branch: string,
  choices: ElectiveChoices,
): Subject[] {
  return list.filter((s) => {
    const offering = s.offerings?.find((o) => o.branch === branch);
    const slot = offering ? slotKeyOf(offering.key) : null;
    if (!offering || !slot) return true;
    return choices[choiceId(branch, slot)] === offering.key;
  });
}
