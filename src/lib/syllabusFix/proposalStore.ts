import type { Firestore } from "firebase-admin/firestore";
import { findSubject } from "@/lib/subjects";
import type { Change } from "@/lib/syllabusFix/handoutMatch";
import { EMPTY_OVERLAY, OverlaySchema, type Overlay } from "@/lib/syllabusFix/overlay";
import {
  addVote,
  newProposal,
  proposalId,
  ProposalSchema,
  targetKey,
  VoteSchema,
  type Proposal,
  type Vote,
} from "@/lib/syllabusFix/proposals";
import { planSettle, type SettlePlan } from "@/lib/syllabusFix/settle";
import type { StudentHandout } from "@/lib/syllabusFix/studentHandout";

/*
 * Where proposals live (syllabus fix, Phases 3 to 5). Firestore, written only by the server (the
 * rules deny every browser): `syllabusHandouts/{id}` keeps each confirmed upload, `syllabusFlags/{id}`
 * each flag, `syllabusProposals/{id}` one proposed change with its points, and
 * `syllabusProposals/{id}/votes/{uid}` who added them. Phase 5: `syllabusOverlay/current` holds the
 * changes that went live and `syllabusHistory/{id}` logs every decision (the undo log).
 */

export type HandoutSubmission = {
  uid: string;
  subject: string;
  branch: string;
  semester: number;
  batchYear?: number;
  profileFrom: Vote["profileFrom"];
  handout: StudentHandout;
  at: string;
};

export type SubmitResult = {
  handoutId: string;
  proposals: number;
  counted: number;
  /** Proposals this upload touched, with their points after it (to settle the ones near the rule). */
  touched: Pick<Proposal, "id" | "points" | "status">[];
};

/** One flag (or "My subject isn't here"), as stored. `flag` is the request the student sent. */
export type FlagSubmission = {
  uid: string;
  branch: string;
  semester: number;
  batchYear?: number;
  profileFrom: Vote["profileFrom"];
  level: "course" | "chapter" | "topic" | "missing-subject";
  flag: Record<string, unknown>;
  at: string;
};

export type FlagSubmitResult = {
  flagId: string;
  proposalId: string;
  /** False when this student already backed this change, or it is already decided. */
  counted: boolean;
  status: Proposal["status"];
};

/** One student's answer to an "Agree?" prompt (Phase 5). */
export type VoteSubmission = Omit<Vote, "kind" | "handoutId" | "flagId"> & {
  kind: "agree" | "disagree" | "unsure";
  proposalId: string;
};

export type SettleResult = Pick<SettlePlan, "verdict"> & { status: Proposal["status"] };

export interface ProposalStore {
  submitHandout(
    submission: HandoutSubmission,
    changes: readonly Change[],
    points: number,
  ): Promise<SubmitResult>;
  submitFlag(submission: FlagSubmission, change: Change, points: number): Promise<FlagSubmitResult>;
  /** Records an Agree / Disagree / Not sure. Not counted when already voted or settled. */
  castVote(vote: VoteSubmission): Promise<{ counted: boolean; status: Proposal["status"] | null }>;
  /** Counts the votes and applies, queues or leaves the proposal (Phase 5 rules). */
  settle(proposalId: string, at: string): Promise<SettleResult | null>;
  /** Pending proposals of one branch and semester (for "Agree?" prompts). */
  pendingFor(branch: string, semester: number, limit: number): Promise<Proposal[]>;
  /** Which of these proposals the student already voted on. */
  votedOn(uid: string, ids: readonly string[]): Promise<Set<string>>;
  /** The live fixes (`syllabusOverlay/current`). */
  overlay(): Promise<Overlay>;
}

/** Proposals whose new points might reach the auto-apply rule: worth settling now. */
export function worthSettling<T extends Pick<Proposal, "points" | "status">>(
  proposals: readonly T[],
  minPoints: number,
): T[] {
  return proposals.filter((p) => p.status === "pending" && p.points >= minPoints);
}

/** A flag's record id: one per student per proposal, so flagging the same thing twice is one flag. */
export const flagRecordId = (proposal: string, uid: string) => `${proposal}__${uid}`;

/** The writes one submission makes, worked out from what is stored already. Pure. */
export function planSubmission(
  changes: readonly Change[],
  existing: ReadonlyMap<string, Proposal>,
  votedOn: ReadonlySet<string>,
  vote: Vote,
): { proposals: Proposal[]; votes: string[] } {
  const proposals = new Map<string, Proposal>();
  const votes: string[] = [];
  for (const change of changes) {
    const id = proposalId(change);
    if (proposals.has(id)) continue; // the same change twice in one handout counts once
    const before = existing.get(id) ?? newProposal(change, vote.at);
    // An applied or rejected proposal is settled: a new upload does not reopen it.
    if (before.status !== "pending") continue;
    const voted = votedOn.has(id);
    proposals.set(id, addVote(before, vote, voted));
    if (!voted) votes.push(id);
  }
  return { proposals: [...proposals.values()], votes };
}

type Voter = Pick<
  HandoutSubmission,
  "uid" | "branch" | "semester" | "batchYear" | "profileFrom" | "at"
>;

function voteOf(s: Voter, points: number, from: { handoutId: string } | { flagId: string }): Vote {
  return {
    uid: s.uid,
    kind: "handoutId" in from ? "handout" : "flag",
    points,
    branch: s.branch,
    semester: s.semester,
    ...(s.batchYear ? { batchYear: s.batchYear } : {}),
    profileFrom: s.profileFrom,
    ...from,
    at: s.at,
  };
}

/** What one flag does to its proposal, from what is stored already. Pure. */
export function planFlag(
  change: Change,
  existing: Proposal | undefined,
  voted: boolean,
  vote: Vote,
): { proposal: Proposal | null; counted: boolean; status: Proposal["status"] } {
  const plan = planSubmission(
    [change],
    existing ? new Map([[existing.id, existing]]) : new Map(),
    voted ? new Set([proposalId(change)]) : new Set(),
    vote,
  );
  return {
    proposal: plan.proposals[0] ?? null,
    counted: plan.votes.length > 0,
    status: existing?.status ?? "pending",
  };
}

const keyOf = (p: Proposal) => p.targetKey ?? targetKey(p.change as Change);

const parsedAll = <T>(docs: { data(): unknown }[], parse: (d: unknown) => T | undefined): T[] =>
  docs.flatMap((d) => {
    const v = parse(d.data());
    return v === undefined ? [] : [v];
  });

/** Firestore through the Admin SDK. One transaction: a retry never counts a vote twice. */
export function adminProposalStore(db: Firestore): ProposalStore {
  const proposalsCol = db.collection("syllabusProposals");
  const handoutsCol = db.collection("syllabusHandouts");
  const overlayRef = db.collection("syllabusOverlay").doc("current");
  return {
    async submitHandout(submission, changes, points) {
      const handoutRef = handoutsCol.doc();
      const vote = voteOf(submission, points, { handoutId: handoutRef.id });
      const ids = [...new Set(changes.map(proposalId))];
      return db.runTransaction(async (tx) => {
        const refs = ids.map((id) => proposalsCol.doc(id));
        const voteRefs = refs.map((r) => r.collection("votes").doc(submission.uid));
        const snaps = refs.length ? await tx.getAll(...refs) : [];
        const voteSnaps = voteRefs.length ? await tx.getAll(...voteRefs) : [];
        const existing = new Map<string, Proposal>();
        for (const snap of snaps) {
          const parsed = ProposalSchema.safeParse(snap.data());
          if (snap.exists && parsed.success) existing.set(snap.id, parsed.data);
        }
        const votedOn = new Set(ids.filter((_, i) => voteSnaps[i]?.exists));
        const plan = planSubmission(changes, existing, votedOn, vote);
        for (const p of plan.proposals) tx.set(proposalsCol.doc(p.id), p);
        for (const id of plan.votes)
          tx.set(proposalsCol.doc(id).collection("votes").doc(submission.uid), vote);
        tx.set(handoutRef, { ...submission, proposalIds: plan.proposals.map((p) => p.id) });
        return {
          handoutId: handoutRef.id,
          proposals: plan.proposals.length,
          counted: plan.votes.length,
          touched: plan.proposals.map(({ id, points: pts, status }) => ({
            id,
            points: pts,
            status,
          })),
        };
      });
    },
    async submitFlag(submission, change, points) {
      const pid = proposalId(change);
      const flagId = flagRecordId(pid, submission.uid);
      const vote = voteOf(submission, points, { flagId });
      const ref = proposalsCol.doc(pid);
      const voteRef = ref.collection("votes").doc(submission.uid);
      return db.runTransaction(async (tx) => {
        const [snap, voteSnap] = await tx.getAll(ref, voteRef);
        const parsed = ProposalSchema.safeParse(snap.data());
        const plan = planFlag(
          change,
          snap.exists && parsed.success ? parsed.data : undefined,
          voteSnap.exists,
          vote,
        );
        if (plan.proposal) tx.set(ref, plan.proposal);
        if (plan.counted) tx.set(voteRef, vote);
        tx.set(db.collection("syllabusFlags").doc(flagId), { ...submission, proposalId: pid });
        return { flagId, proposalId: pid, counted: plan.counted, status: plan.status };
      });
    },
    async castVote(input) {
      const { proposalId: pid, ...vote } = input;
      const ref = proposalsCol.doc(pid);
      const voteRef = ref.collection("votes").doc(vote.uid);
      return db.runTransaction(async (tx) => {
        const [snap, voteSnap] = await tx.getAll(ref, voteRef);
        const parsed = ProposalSchema.safeParse(snap.data());
        if (!snap.exists || !parsed.success) return { counted: false, status: null };
        if (parsed.data.status !== "pending" || voteSnap.exists)
          return { counted: false, status: parsed.data.status };
        tx.set(ref, addVote(parsed.data, vote, false));
        tx.set(voteRef, vote);
        return { counted: true, status: parsed.data.status };
      });
    },
    async settle(pid, at) {
      const ref = proposalsCol.doc(pid);
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const parsed = ProposalSchema.safeParse(snap.data());
        if (!snap.exists || !parsed.success) return null;
        const proposal = parsed.data;
        if (proposal.status !== "pending")
          return { verdict: { action: "wait" as const }, status: proposal.status };
        const key = keyOf(proposal);
        // Equality filters only: no composite index to create in the console.
        const [votes, rivals, overlaySnap] = await Promise.all([
          tx.get(ref.collection("votes")),
          key
            ? tx.get(proposalsCol.where("targetKey", "==", key).where("status", "==", "pending"))
            : null,
          tx.get(overlayRef),
        ]);
        const plan = planSettle({
          proposal,
          votes: parsedAll(votes.docs, (d) => VoteSchema.safeParse(d).data),
          rivals: parsedAll(rivals?.docs ?? [], (d) => ProposalSchema.safeParse(d).data),
          overlay: OverlaySchema.safeParse(overlaySnap.data()).data ?? EMPTY_OVERLAY,
          course: findSubject(proposal.subject),
          at,
        });
        for (const p of plan.proposals) tx.set(proposalsCol.doc(p.id), p);
        if (plan.overlay) tx.set(overlayRef, plan.overlay);
        for (const h of plan.history) tx.set(db.collection("syllabusHistory").doc(h.id), h);
        return { verdict: plan.verdict, status: plan.proposals[0].status };
      });
    },
    async pendingFor(branch, semester, limit) {
      const snap = await proposalsCol
        .where("branch", "==", branch)
        .where("semester", "==", semester)
        .where("status", "==", "pending")
        .limit(limit)
        .get();
      return parsedAll(snap.docs, (d) => ProposalSchema.safeParse(d).data);
    },
    async votedOn(uid, ids) {
      if (ids.length === 0) return new Set<string>();
      const snaps = await db.getAll(
        ...ids.map((id) => proposalsCol.doc(id).collection("votes").doc(uid)),
      );
      return new Set(ids.filter((_, i) => snaps[i]?.exists));
    },
    async overlay() {
      const snap = await overlayRef.get();
      return OverlaySchema.safeParse(snap.data()).data ?? EMPTY_OVERLAY;
    },
  };
}

/** In memory, for tests and local runs without Firebase. */
export function memoryProposalStore(): ProposalStore & {
  proposals: Map<string, Proposal>;
  votes: Map<string, Vote>;
  handouts: Map<string, HandoutSubmission>;
  flags: Map<string, FlagSubmission & { proposalId: string }>;
  live: { overlay: Overlay; history: SettlePlan["history"] };
} {
  const proposals = new Map<string, Proposal>();
  const votes = new Map<string, Vote>();
  const handouts = new Map<string, HandoutSubmission>();
  const flags = new Map<string, FlagSubmission & { proposalId: string }>();
  const live: { overlay: Overlay; history: SettlePlan["history"] } = {
    overlay: EMPTY_OVERLAY,
    history: [],
  };
  return {
    proposals,
    votes,
    handouts,
    flags,
    live,
    async submitFlag(submission, change, points) {
      const pid = proposalId(change);
      const flagId = flagRecordId(pid, submission.uid);
      const vote = voteOf(submission, points, { flagId });
      const voteKey = `${pid}/${submission.uid}`;
      const plan = planFlag(change, proposals.get(pid), votes.has(voteKey), vote);
      if (plan.proposal) proposals.set(pid, plan.proposal);
      if (plan.counted) votes.set(voteKey, vote);
      flags.set(flagId, { ...submission, proposalId: pid });
      return { flagId, proposalId: pid, counted: plan.counted, status: plan.status };
    },
    async submitHandout(submission, changes, points) {
      const handoutId = `h${handouts.size + 1}`;
      const vote = voteOf(submission, points, { handoutId });
      const votedOn = new Set(
        [...votes.keys()]
          .filter((k) => k.endsWith(`/${submission.uid}`))
          .map((k) => k.split("/")[0]),
      );
      const plan = planSubmission(changes, proposals, votedOn, vote);
      for (const p of plan.proposals) proposals.set(p.id, p);
      for (const id of plan.votes) votes.set(`${id}/${submission.uid}`, vote);
      handouts.set(handoutId, submission);
      return {
        handoutId,
        proposals: plan.proposals.length,
        counted: plan.votes.length,
        touched: plan.proposals.map(({ id, points: pts, status }) => ({ id, points: pts, status })),
      };
    },
    async castVote(input) {
      const { proposalId: pid, ...vote } = input;
      const p = proposals.get(pid);
      if (!p) return { counted: false, status: null };
      const key = `${pid}/${vote.uid}`;
      if (p.status !== "pending" || votes.has(key)) return { counted: false, status: p.status };
      proposals.set(pid, addVote(p, vote, false));
      votes.set(key, vote);
      return { counted: true, status: p.status };
    },
    async settle(pid, at) {
      const proposal = proposals.get(pid);
      if (!proposal) return null;
      if (proposal.status !== "pending")
        return { verdict: { action: "wait" as const }, status: proposal.status };
      const key = keyOf(proposal);
      const plan = planSettle({
        proposal,
        votes: [...votes].filter(([k]) => k.startsWith(`${pid}/`)).map(([, v]) => v),
        rivals: key
          ? [...proposals.values()].filter((p) => keyOf(p) === key && p.status === "pending")
          : [],
        overlay: live.overlay,
        course: findSubject(proposal.subject),
        at,
      });
      for (const p of plan.proposals) proposals.set(p.id, p);
      if (plan.overlay) live.overlay = plan.overlay;
      live.history.push(...plan.history);
      return { verdict: plan.verdict, status: plan.proposals[0].status };
    },
    async pendingFor(branch, semester, limit) {
      return [...proposals.values()]
        .filter((p) => p.branch === branch && p.semester === semester && p.status === "pending")
        .slice(0, limit);
    },
    async votedOn(uid, ids) {
      return new Set(ids.filter((id) => votes.has(`${id}/${uid}`)));
    },
    async overlay() {
      return live.overlay;
    },
  };
}
