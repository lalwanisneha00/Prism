import type { Subject } from "@/lib/subjects";
import { historyEntry, type HistoryEntry } from "@/lib/syllabusFix/history";
import {
  assignIds,
  LiveChangeSchema,
  type AppliedChange,
  type Overlay,
} from "@/lib/syllabusFix/overlay";
import { targetKey, type Proposal, type Vote } from "@/lib/syllabusFix/proposals";
import { SYLLABUS_FIX_CONFIG } from "@/lib/syllabusFix/config";
import { decide, tally, type Tally, type Verdict } from "@/lib/syllabusFix/voting";

/*
 * Settling a proposal (syllabus fix, Phase 5): after each flag, upload or vote, the engine counts
 * the votes and decides. Pure: the stores read what is needed, call `planSettle`, and write what
 * it returns in one transaction.
 */

export type SettlePlan = {
  verdict: Verdict;
  tally: Tally;
  /** Proposals to write back (this one, and its rivals when they conflict). */
  proposals: Proposal[];
  /** The overlay with this change added, when it goes live. */
  overlay?: Overlay;
  applied?: AppliedChange;
  /** `syllabusHistory` entries (the undo log). */
  history: HistoryEntry[];
};

/** The history target of a change: the deepest node it is about. */
function targetOf(change: AppliedChange["change"]): HistoryEntry["target"] {
  const p = change.prism ?? (change.to?.subject ? { subject: change.to.subject } : undefined);
  const chapter = change.prism?.chapter ?? change.to?.chapter;
  if (p && change.prism?.topic)
    return { kind: "topic", subject: p.subject, chapter, topic: change.prism.topic };
  if (p && chapter) return { kind: "chapter", subject: p.subject, chapter };
  if (p) return { kind: "subject", subject: p.subject };
  return { kind: "branch" };
}

export function planSettle(input: {
  proposal: Proposal;
  votes: readonly Vote[];
  /** Other pending proposals with the same target key. */
  rivals: readonly Proposal[];
  overlay: Overlay;
  /** The course the proposal is about (batch years; ids for new topics). */
  course?: Subject;
  at: string;
  config?: typeof SYLLABUS_FIX_CONFIG;
}): SettlePlan {
  const config = input.config ?? SYLLABUS_FIX_CONFIG;
  const { proposal, at } = input;
  const count = tally(proposal, input.votes, input.course ?? {}, config);
  const key = proposal.targetKey ?? targetKey(LiveChangeSchema.parse(proposal.change)) ?? undefined;
  const rivals = input.rivals.filter((r) => r.id !== proposal.id && r.status === "pending");
  const verdict = decide(
    proposal,
    count,
    rivals.map((r) => ({ id: r.id, points: r.points })),
    config,
  );
  // The stored points follow the counted ones (votes from other branches never add up).
  const base: Proposal = {
    ...proposal,
    points: count.points,
    voters: count.supporters,
    ...(key ? { targetKey: key } : {}),
  };
  const history = (field: string, oldValue: unknown, newValue: unknown) =>
    historyEntry({
      at,
      actor: { kind: "system" },
      cause: `proposal ${proposal.id}`,
      target: targetOf(LiveChangeSchema.parse(proposal.change)),
      field,
      oldValue,
      newValue,
    });

  switch (verdict.action) {
    case "wait":
      return { verdict, tally: count, proposals: [base], history: [] };
    case "review":
      return {
        verdict,
        tally: count,
        proposals: [{ ...base, status: "review", updatedAt: at }],
        history: [history("proposal status", "pending", "review")],
      };
    case "conflict": {
      const strong = rivals.filter((r) => verdict.rivals.includes(r.id));
      return {
        verdict,
        tally: count,
        proposals: [
          { ...base, status: "conflict", updatedAt: at },
          ...strong.map((r) => ({ ...r, status: "conflict" as const, updatedAt: at })),
        ],
        history: [proposal, ...strong].map((p) =>
          historyEntry({
            at,
            actor: { kind: "system" },
            cause: `proposal ${p.id}`,
            target: targetOf(LiveChangeSchema.parse(p.change)),
            field: "proposal status",
            oldValue: "pending",
            newValue: "conflict",
          }),
        ),
      };
    }
    case "apply": {
      const change = LiveChangeSchema.parse(proposal.change);
      const newIds = input.course ? assignIds(change, input.course) : undefined;
      const applied: AppliedChange = {
        proposalId: proposal.id,
        change,
        appliedAt: at,
        supporters: count.supporters,
        ...(newIds ? { newIds } : {}),
      };
      return {
        verdict,
        tally: count,
        proposals: [{ ...base, status: "applied", appliedAt: at, updatedAt: at }],
        overlay: {
          version: 1,
          updatedAt: at,
          changes: [...input.overlay.changes.filter((c) => c.proposalId !== proposal.id), applied],
        },
        applied,
        history: [history(change.type, null, { proposalId: proposal.id, change, newIds })],
      };
    }
  }
}
