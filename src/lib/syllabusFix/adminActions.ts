import type { Subject } from "@/lib/subjects";
import { afterRevert, type Trust } from "@/lib/syllabusFix/abuse";
import { SYLLABUS_FIX_CONFIG } from "@/lib/syllabusFix/config";
import type { ChangeType } from "@/lib/syllabusFix/handoutMatch";
import { historyEntry, type HistoryEntry } from "@/lib/syllabusFix/history";
import type { LessonStatus } from "@/lib/syllabusFix/lessonReview";
import { applyOverlay, LiveChangeSchema, type Overlay } from "@/lib/syllabusFix/overlay";
import type { Proposal, Vote } from "@/lib/syllabusFix/proposals";
import { goLive, targetOf } from "@/lib/syllabusFix/settle";
import { resolveMeta } from "@/lib/syllabusFix/tree";
import { AUTO_APPLY_TYPES } from "@/lib/syllabusFix/voting";

/*
 * What the admin's buttons do (syllabus fix, Phase 6), all pure. The stores read what is needed,
 * call one of these, and write what it returns in one transaction. Every decision adds a history
 * entry with the admin as the actor, so the undo log always says who did what.
 */

type Admin = { uid: string };

const adminActor = (a: Admin): HistoryEntry["actor"] => ({ kind: "admin", id: a.uid });

function statusEntry(p: Proposal, from: string, to: string, at: string, admin: Admin) {
  return historyEntry({
    at,
    actor: adminActor(admin),
    cause: `proposal ${p.id}`,
    target: targetOf(LiveChangeSchema.parse(p.change)),
    field: "proposal status",
    oldValue: from,
    newValue: to,
  });
}

export type RevertPlan = {
  proposal: Proposal;
  overlay: Overlay;
  /** The new "revert" entry, then the original entries marked reverted. */
  history: HistoryEntry[];
  /** Updated trust records of the students who backed the fix. */
  trusts: Trust[];
};

/**
 * Undo a fix that went live: the overlay keeps it but skips it (`reverted`), the proposal becomes
 * rejected (a new flag does not reopen it), the history entry that applied it is marked reverted,
 * and every student who backed it gets a reverted mark (`afterRevert`).
 */
export function planRevert(input: {
  proposal: Proposal;
  overlay: Overlay;
  /** History entries caused by this proposal. */
  history: readonly HistoryEntry[];
  votes: readonly Vote[];
  trusts: ReadonlyMap<string, Trust>;
  admin: Admin;
  at: string;
}): RevertPlan | { error: string } {
  const { proposal, overlay, admin, at } = input;
  const live = overlay.changes.find((c) => c.proposalId === proposal.id && !c.reverted);
  if (proposal.status !== "applied" || !live) return { error: "This fix is not live." };
  const change = live.change;
  const undo = historyEntry({
    at,
    actor: adminActor(admin),
    cause: `revert proposal ${proposal.id}`,
    target: targetOf(change),
    field: change.type,
    oldValue: { proposalId: proposal.id, change, newIds: live.newIds },
    newValue: null,
  });
  const undone = input.history
    .filter((h) => !h.reverted && h.field === change.type)
    .map((h) => ({ ...h, reverted: true, revertedBy: undo.id }));
  const backers = [...new Set(input.votes.filter((v) => v.points > 0).map((v) => v.uid))];
  return {
    proposal: {
      ...proposal,
      status: "rejected",
      revertedAt: at,
      decidedBy: admin.uid,
      updatedAt: at,
    },
    overlay: {
      ...overlay,
      updatedAt: at,
      changes: overlay.changes.map((c) =>
        c.proposalId === proposal.id ? { ...c, reverted: true, revertedAt: at } : c,
      ),
    },
    history: [undo, statusEntry(proposal, "applied", "rejected", at, admin), ...undone],
    trusts: backers.map((uid) => afterRevert(input.trusts.get(uid), uid, proposal.id, at)),
  };
}

export type DecisionPlan = {
  /** This proposal first, then rivals it settles. */
  proposals: Proposal[];
  overlay?: Overlay;
  history: HistoryEntry[];
  /** live = in the overlay now; accepted = waits for the next syllabus data update. */
  outcome: "live" | "accepted" | "rejected";
};

/** True when the live overlay can make this kind of change (the engine's own list). */
export const canGoLive = (type: string) => AUTO_APPLY_TYPES.includes(type as ChangeType);

/**
 * The admin decides a proposal waiting in a queue (`review` or `conflict`).
 * - approve: a change the overlay can make goes live, any other is `accepted`; rivals in the same
 *   conflict are rejected (one side wins).
 * - reject: this proposal and its rivals in the same conflict are rejected ("reject both").
 */
export function planDecision(input: {
  proposal: Proposal;
  action: "approve" | "reject";
  /** Proposals with the same target key (any status; only `conflict` ones are settled). */
  rivals: readonly Proposal[];
  overlay: Overlay;
  course: Subject | undefined;
  admin: Admin;
  at: string;
}): DecisionPlan | { error: string } {
  const { proposal, admin, at } = input;
  if (proposal.status !== "review" && proposal.status !== "conflict")
    return { error: "This suggestion is not waiting for a decision." };
  const rivals = input.rivals.filter((r) => r.id !== proposal.id && r.status === "conflict");
  const reject = (p: Proposal): Proposal => ({
    ...p,
    status: "rejected",
    decidedBy: admin.uid,
    updatedAt: at,
  });
  const rejectedRivals = rivals.map(reject);
  const rivalHistory = rivals.map((r) => statusEntry(r, r.status, "rejected", at, admin));

  if (input.action === "reject")
    return {
      proposals: [reject(proposal), ...rejectedRivals],
      history: [statusEntry(proposal, proposal.status, "rejected", at, admin), ...rivalHistory],
      outcome: "rejected",
    };

  if (canGoLive(proposal.type)) {
    const live = goLive(
      proposal,
      proposal.voters,
      input.overlay,
      input.course,
      at,
      adminActor(admin),
    );
    return {
      proposals: [...live.proposals, ...rejectedRivals],
      overlay: live.overlay,
      history: [
        statusEntry(proposal, proposal.status, "applied", at, admin),
        ...live.history,
        ...rivalHistory,
      ],
      outcome: "live",
    };
  }
  return {
    proposals: [
      { ...proposal, status: "accepted", decidedBy: admin.uid, updatedAt: at },
      ...rejectedRivals,
    ],
    history: [statusEntry(proposal, proposal.status, "accepted", at, admin), ...rivalHistory],
    outcome: "accepted",
  };
}

/**
 * A lesson in review after repeated flags:
 * - fine: back to ok, flags cleared (the same version stays; new flags count from zero);
 * - regenerate: rebuilt with the students' notes the next time someone opens it (never in bulk).
 */
export function lessonAfterAdmin(
  status: LessonStatus,
  action: "fine" | "regenerate",
  at: string,
): LessonStatus {
  const rest: LessonStatus = { ...status };
  delete rest.claimedAt;
  return action === "fine"
    ? { ...rest, state: "ok", flaggedBy: [], updatedAt: at }
    : { ...rest, state: "needs_regeneration", updatedAt: at };
}

/** Pending proposals close to going live, strongest first. */
export function nearThreshold(
  pending: readonly Proposal[],
  config: Pick<typeof SYLLABUS_FIX_CONFIG, "autoApply" | "admin"> = SYLLABUS_FIX_CONFIG,
): Proposal[] {
  const floor = config.autoApply.minPoints - config.admin.nearThresholdGap;
  return pending
    .filter((p) => p.status === "pending" && p.points >= floor && p.points > 0)
    .sort((a, b) => b.points - a.points || b.voters - a.voters);
}

export type BranchHealth = { branch: string; courses: number; verified: number; percent: number };

/** Per branch: how many of its active courses are verified (with the live fixes on top). */
export function branchHealth(
  catalogue: readonly Subject[],
  overlay: Overlay,
  branches: readonly string[],
): BranchHealth[] {
  const live = catalogue
    .filter((s) => s.university === "pdeu")
    .map((s) => applyOverlay(s, overlay))
    .filter((s) => resolveMeta(s).status === "active");
  return branches.map((branch) => {
    const courses = live.filter(
      (s) => (s.offerings ?? []).some((o) => o.branch === branch) || s.branches.includes(branch),
    );
    const verified = courses.filter((s) => resolveMeta(s).confidence === "verified").length;
    return {
      branch,
      courses: courses.length,
      verified,
      percent: courses.length ? Math.round((verified / courses.length) * 100) : 0,
    };
  });
}
