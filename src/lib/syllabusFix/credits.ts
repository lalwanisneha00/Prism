import { z } from "zod";
import { activeChanges, type Overlay } from "@/lib/syllabusFix/overlay";
import type { Proposal, Vote } from "@/lib/syllabusFix/proposals";
import { SYLLABUS_FIX_CONFIG } from "@/lib/syllabusFix/config";
import { voteCounts } from "@/lib/syllabusFix/voting";

/*
 * Thanking the fixers (syllabus fix, Phase 7), pure. Like a name on the "contributors" page of a
 * book: when a change goes live, every student whose report, upload or "Agree" counted towards it
 * gets it added to their record (`syllabusCredits/{uid}`), so the app can say "Your fix went
 * live" and show how many fixes they helped with.
 */

/** Records kept per student; the oldest drop off (the count still shows up to this many). */
export const MAX_CREDITS = 200;

export const CreditsSchema = z.object({
  uid: z.string().min(1),
  fixes: z.array(z.object({ proposalId: z.string().min(1), appliedAt: z.string().min(1) })),
  updatedAt: z.string().min(1),
});
export type Credits = z.infer<typeof CreditsSchema>;

/** The students to thank for a change: each one whose vote counted and added points. */
export function creditedUids(
  proposal: Pick<Proposal, "branch" | "semester">,
  votes: readonly Vote[],
  course: { batchYears?: readonly number[] } = {},
  paused?: ReadonlySet<string>,
): string[] {
  const uids = votes
    .filter(
      (v) =>
        v.points > 0 &&
        voteCounts(v, proposal, course, SYLLABUS_FIX_CONFIG, paused ?? new Set()).counts,
    )
    .map((v) => v.uid);
  return [...new Set(uids)];
}

/** A student's record with one more live fix. The same fix twice: unchanged. */
export function withCredit(
  credits: Credits | undefined,
  uid: string,
  proposalId: string,
  at: string,
): Credits {
  const before = credits ?? { uid, fixes: [], updatedAt: at };
  if (before.fixes.some((f) => f.proposalId === proposalId)) return before;
  return {
    uid,
    fixes: [...before.fixes, { proposalId, appliedAt: at }].slice(-MAX_CREDITS),
    updatedAt: at,
  };
}

/** One fix a student helped with, as the app shows it. */
export type Contribution = {
  proposalId: string;
  /** The change in plain words ("Introduction to AI is taught in semester 3"). */
  text: string;
  appliedAt: string;
  /** Students whose votes made it pass. */
  students: number;
};

/**
 * The student's fixes that are live now, newest first. A fix the admin reverted is left out
 * (it is no longer in use). `describe` turns a change into words (needs the syllabus).
 */
export function contributionsOf(
  credits: Credits | undefined,
  overlay: Overlay,
  describe: (change: Overlay["changes"][number]["change"]) => string,
): Contribution[] {
  if (!credits) return [];
  const live = new Map(activeChanges(overlay).map((a) => [a.proposalId, a]));
  return credits.fixes
    .flatMap((f) => {
      const a = live.get(f.proposalId);
      return a
        ? [
            {
              proposalId: a.proposalId,
              text: describe(a.change),
              appliedAt: a.appliedAt,
              students: a.supporters,
            },
          ]
        : [];
    })
    .sort((x, y) => y.appliedAt.localeCompare(x.appliedAt));
}

/** "Your fix went live: ... 3 students backed it." */
export function thanksLine(c: Pick<Contribution, "text" | "students">): string {
  const n = c.students;
  return `Your fix went live: ${c.text}. ${n} student${n === 1 ? "" : "s"} backed it, and it now shows for everyone in your class.`;
}
