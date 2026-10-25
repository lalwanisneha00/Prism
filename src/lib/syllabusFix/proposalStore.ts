import type { Firestore } from "firebase-admin/firestore";
import type { Change } from "@/lib/syllabusFix/handoutMatch";
import {
  addVote,
  newProposal,
  proposalId,
  ProposalSchema,
  type Proposal,
  type Vote,
} from "@/lib/syllabusFix/proposals";
import type { StudentHandout } from "@/lib/syllabusFix/studentHandout";

/*
 * Where proposals live (syllabus fix, Phases 3 and 4). Firestore, written only by the server (the
 * rules deny every browser): `syllabusHandouts/{id}` keeps each confirmed upload, `syllabusFlags/{id}`
 * each flag, `syllabusProposals/{id}` one proposed change with its points, and
 * `syllabusProposals/{id}/votes/{uid}` who added them.
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

export type SubmitResult = { handoutId: string; proposals: number; counted: number };

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

export interface ProposalStore {
  submitHandout(
    submission: HandoutSubmission,
    changes: readonly Change[],
    points: number,
  ): Promise<SubmitResult>;
  submitFlag(submission: FlagSubmission, change: Change, points: number): Promise<FlagSubmitResult>;
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

/** Firestore through the Admin SDK. One transaction: a retry never counts a vote twice. */
export function adminProposalStore(db: Firestore): ProposalStore {
  const proposalsCol = db.collection("syllabusProposals");
  const handoutsCol = db.collection("syllabusHandouts");
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
  };
}

/** In memory, for tests and local runs without Firebase. */
export function memoryProposalStore(): ProposalStore & {
  proposals: Map<string, Proposal>;
  votes: Map<string, Vote>;
  handouts: Map<string, HandoutSubmission>;
  flags: Map<string, FlagSubmission & { proposalId: string }>;
} {
  const proposals = new Map<string, Proposal>();
  const votes = new Map<string, Vote>();
  const handouts = new Map<string, HandoutSubmission>();
  const flags = new Map<string, FlagSubmission & { proposalId: string }>();
  return {
    proposals,
    votes,
    handouts,
    flags,
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
      return { handoutId, proposals: plan.proposals.length, counted: plan.votes.length };
    },
  };
}
