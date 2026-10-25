import type { Subject } from "@/lib/subjects";

/*
 * Elective slots ("Program Elective 1", "Open Elective 2"): the student picks one option per slot,
 * or several where the slot says so (`picks`, e.g. ME semester 7: 3). An option's course key looks
 * like "<slot key>--<option>", so the slot is the part before "--". The first choice is saved in
 * the student's synced settings as "<branch>/<slot key>" → option key; further choices of a
 * multi-pick slot as "<branch>/<slot key>#2", "#3" (older saved choices keep working).
 */

export type ElectiveChoices = Record<string, string>;

export const slotKeyOf = (courseKey: string): string | null =>
  courseKey.includes("--") ? courseKey.split("--")[0] : null;

export const choiceId = (branch: string, slotKey: string): string => `${branch}/${slotKey}`;

/** The settings key of the n-th choice (1-based) of a slot. */
export const pickId = (branch: string, slotKey: string, pick: number): string =>
  pick <= 1 ? choiceId(branch, slotKey) : `${choiceId(branch, slotKey)}#${pick}`;

/** Every option key chosen for a slot, in pick order (empty strings for picks not made yet). */
export function choicesFor(
  choices: ElectiveChoices,
  branch: string,
  slotKey: string,
  picks = 1,
): string[] {
  return Array.from({ length: picks }, (_, i) => choices[pickId(branch, slotKey, i + 1)] ?? "");
}

/** The subjects a student studies in a semester: every course, and only the chosen options of each elective slot. */
export function visibleSubjects(
  list: readonly Subject[],
  branch: string,
  choices: ElectiveChoices,
): Subject[] {
  return list.filter((s) => {
    const offering = s.offerings?.find((o) => o.branch === branch);
    const slot = offering ? slotKeyOf(offering.key) : null;
    if (!offering || !slot) return true;
    const id = choiceId(branch, slot);
    return Object.entries(choices).some(
      ([k, v]) => (k === id || k.startsWith(`${id}#`)) && v === offering.key,
    );
  });
}
