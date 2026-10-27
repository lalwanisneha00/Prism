import { z } from "zod";
import { SYLLABUS_FIX_CONFIG } from "@/lib/syllabusFix/config";

/*
 * Abuse guards (syllabus fix, Phase 6), pure rules. Like a library card: each student may borrow
 * a set number of books a day, and a reader whose returned books keep turning out damaged stops
 * being allowed to vote on new purchases. They can still read; the librarian can lift it.
 */

export const USAGE_KINDS = ["flag", "missing", "handout", "vote", "lessonFlag"] as const;
export type UsageKind = (typeof USAGE_KINDS)[number];

type Limits = Record<UsageKind, number>;

/** One student's sends on one day (`syllabusUsage/{uid}__{day}`). Missing kinds = 0. */
export const UsageSchema = z.object({
  uid: z.string().min(1),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  counts: z.partialRecord(z.enum(USAGE_KINDS), z.int().min(0)),
});
export type Usage = z.infer<typeof UsageSchema>;

/** The UTC day of a time, as YYYY-MM-DD (the limit resets at 05:30 IST). */
export const dayOf = (at: string) => at.slice(0, 10);

export const usageId = (uid: string, at: string) => `${uid}__${dayOf(at)}`;

/** Takes one send from today's allowance, or says no (the counts stay as they were). */
export function takeAllowance(
  usage: Usage | undefined,
  uid: string,
  kind: UsageKind,
  at: string,
  limits: Limits = SYLLABUS_FIX_CONFIG.dailyLimits,
): { ok: true; usage: Usage } | { ok: false; limit: number } {
  const day = dayOf(at);
  const counts = usage && usage.day === day ? usage.counts : {};
  const used = counts[kind] ?? 0;
  if (used >= limits[kind]) return { ok: false, limit: limits[kind] };
  return { ok: true, usage: { uid, day, counts: { ...counts, [kind]: used + 1 } } };
}

/** What the student sees past the limit. No em dashes. */
export function limitMessage(kind: UsageKind): string {
  const what: Record<UsageKind, string> = {
    flag: "reports",
    missing: "missing subject reports",
    handout: "handout uploads",
    vote: "answers",
    lessonFlag: "lesson reports",
  };
  return `You have sent the most ${what[kind]} allowed today. Try again tomorrow.`;
}

/** How far the admin trusts one student's votes (`syllabusTrust/{uid}`). */
export const TrustSchema = z.object({
  uid: z.string().min(1),
  /** Fixes this student backed that the admin later reverted (one per proposal). */
  revertedFixes: z.array(z.string().min(1)),
  /** True = votes stop counting. Set by the rule; the admin can lift it. */
  paused: z.boolean(),
  /** The admin lifted the pause at this many reverts: it only comes back with a new revert. */
  resumedAt: z.int().min(0).optional(),
  updatedAt: z.string().min(1),
});
export type Trust = z.infer<typeof TrustSchema>;

/** The student's record after a fix they backed was reverted. Counting the same fix twice: same. */
export function afterRevert(
  trust: Trust | undefined,
  uid: string,
  proposalId: string,
  at: string,
  config: { pauseAfterReverts: number } = SYLLABUS_FIX_CONFIG.trust,
): Trust {
  const before = trust ?? { uid, revertedFixes: [], paused: false, updatedAt: at };
  if (before.revertedFixes.includes(proposalId)) return before;
  const revertedFixes = [...before.revertedFixes, proposalId];
  // After the admin lifted a pause, the next revert pauses again (they already had their chances).
  const paused =
    before.paused ||
    before.resumedAt !== undefined ||
    revertedFixes.length >= config.pauseAfterReverts;
  return { ...before, revertedFixes, paused, updatedAt: at };
}

/** The admin lifts a pause. A later revert pauses again. */
export function resumeTrust(trust: Trust, at: string): Trust {
  return { ...trust, paused: false, resumedAt: trust.revertedFixes.length, updatedAt: at };
}

/** The paused students among these records. */
export function pausedSet(trusts: readonly (Trust | undefined)[]): Set<string> {
  return new Set(trusts.filter((t): t is Trust => Boolean(t?.paused)).map((t) => t.uid));
}
