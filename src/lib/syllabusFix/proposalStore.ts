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
 * Where proposals live (syllabus fix, Phase 3). Firestore, written only by the server (the rules
 * deny every browser): `syllabusHandouts/{id}` keeps each confirmed upload, `syllabusProposals/{id}`
 * one proposed change with its points, and `syllabusProposals/{id}/votes/{uid}` who added them.
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

export interface ProposalStore {
  submitHandout(
    submission: HandoutSubmission,
    changes: readonly Change[],
    points: number,
  ): Promise<SubmitResult>;
}

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

const voteOf = (s: HandoutSubmission, points: number, handoutId: string): Vote => ({
  uid: s.uid,
  kind: "handout",
  points,
  branch: s.branch,
  semester: s.semester,
  ...(s.batchYear ? { batchYear: s.batchYear } : {}),
  profileFrom: s.profileFrom,
  handoutId,
  at: s.at,
});

/** Firestore through the Admin SDK. One transaction: a retry never counts a vote twice. */
export function adminProposalStore(db: Firestore): ProposalStore {
  const proposalsCol = db.collection("syllabusProposals");
  const handoutsCol = db.collection("syllabusHandouts");
  return {
    async submitHandout(submission, changes, points) {
      const handoutRef = handoutsCol.doc();
      const vote = voteOf(submission, points, handoutRef.id);
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
  };
}

/** In memory, for tests and local runs without Firebase. */
export function memoryProposalStore(): ProposalStore & {
  proposals: Map<string, Proposal>;
  votes: Map<string, Vote>;
  handouts: Map<string, HandoutSubmission>;
} {
  const proposals = new Map<string, Proposal>();
  const votes = new Map<string, Vote>();
  const handouts = new Map<string, HandoutSubmission>();
  return {
    proposals,
    votes,
    handouts,
    async submitHandout(submission, changes, points) {
      const handoutId = `h${handouts.size + 1}`;
      const vote = voteOf(submission, points, handoutId);
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
