import { z } from "zod";
import type { Change } from "@/lib/syllabusFix/handoutMatch";

/*
 * Proposals (syllabus fix, Phase 3 writes them, Phase 5 votes and applies). A proposal is one
 * specific change ("add topic X to chapter Y"). Students who suggest the same change add points to
 * the same proposal: its id is built from what the change does, not from who suggested it.
 * Think of a suggestion box where identical notes are clipped together and counted.
 */

/** Who contributed and how: one vote per student per proposal. */
export const VoteSchema = z.object({
  uid: z.string().min(1),
  kind: z.enum(["handout", "flag", "agree", "disagree", "unsure"]),
  points: z.number(),
  branch: z.string().optional(),
  semester: z.int().min(1).max(8).optional(),
  batchYear: z.int().min(2000).max(2100).optional(),
  /** "cloud" = read from the student's synced settings on the server; "device" = sent by the app. */
  profileFrom: z.enum(["cloud", "device"]),
  handoutId: z.string().optional(),
  /** The flag record this vote came from (Phase 4). */
  flagId: z.string().optional(),
  at: z.string().min(1),
});
export type Vote = z.infer<typeof VoteSchema>;

/**
 * pending = collecting points; applied = live; rejected = turned down (or reverted after going
 * live); conflict = a rival change to the same thing is also strong (admin decides); review = has
 * the points, but the change is one students cannot make on their own (a new course, a chapter
 * moving to another course), so the admin decides (Phase 6); accepted = the admin agreed, but the
 * live overlay cannot make this kind of change, so it waits for the next syllabus data update.
 */
export const PROPOSAL_STATUSES = [
  "pending",
  "applied",
  "rejected",
  "conflict",
  "review",
  "accepted",
] as const;

export const ProposalSchema = z.object({
  id: z.string().min(1),
  /** The change, as the matcher wrote it (type, ids, where it goes). */
  change: z.record(z.string(), z.unknown()),
  type: z.string().min(1),
  subject: z.string().min(1),
  branch: z.string(),
  semester: z.int().min(1).max(8),
  status: z.enum(PROPOSAL_STATUSES),
  points: z.number(),
  voters: z.int().min(0),
  /** What it changes (one course's place, one chapter, one topic): rivals share it (Phase 5). */
  targetKey: z.string().optional(),
  /** When it went live, and the ids it gave new topics (so every device names them the same). */
  appliedAt: z.string().optional(),
  /** Phase 6: the admin who decided (approve, reject, revert), and when a live fix was undone. */
  decidedBy: z.string().optional(),
  revertedAt: z.string().optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type Proposal = z.infer<typeof ProposalSchema>;

/** Same text → same key: lowercase, plain letters and digits. */
const norm = (s: string | undefined) =>
  (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** FNV-1a, 32 bit, as 8 hex digits: short, stable and free of any crypto library. */
function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * The proposal id of a change. What it does decides the id (type, the Prism node, where it goes,
 * the handout's unit/topic text, split pieces); the wording of `detail` and page numbers do not.
 */
export function proposalId(change: Change): string {
  const parts = [
    change.type,
    change.branch,
    String(change.sem),
    change.prism?.subject,
    change.prism?.chapter,
    change.prism?.topic,
    change.to?.subject,
    change.to?.chapter,
    change.to?.branch,
    change.to?.semester?.toString(),
    change.to?.order?.toString(),
    change.retire ? "retire" : "",
    norm(change.handout?.unit),
    norm(change.handout?.topic),
    ...(change.pieces ?? []).map(norm),
  ];
  // A new course has no Prism id yet: its name tells two suggestions apart. Only added for new
  // courses, so the ids of every other proposal stay as they were.
  if (change.type === "new course" || change.type === "new practical course")
    parts.push(norm(change.handout?.course));
  const subject = change.prism?.subject ?? change.to?.subject ?? "new";
  return `${subject}__${fnv(parts.map((p) => p ?? "").join("|"))}`;
}

/**
 * What a change is about, so two changes that cannot both be right are found ("move topic T to
 * chapter A" and "move topic T to chapter B", or "retire it"). Null for additions, which never
 * contradict each other.
 */
export function targetKey(change: {
  type: string;
  branch: string;
  prism?: { subject: string; chapter?: string; topic?: string };
}): string | null {
  const p = change.prism;
  if (!p) return null;
  switch (change.type) {
    case "course in wrong semester":
    case "course in wrong branch":
    case "course missing from branch/semester":
      return `course:${p.subject}:${change.branch}`;
    case "course duplicate":
      return `duplicate:${p.subject}:${change.branch}`;
    case "unit wrong order":
      return `order:${p.subject}:${p.chapter}`;
    case "unit rename":
      return `name:${p.subject}:${p.chapter}`;
    case "unit under wrong course":
      return `chapter:${p.subject}:${p.chapter}`;
    case "topic under wrong unit":
    case "topic split":
      return `topic:${p.subject}:${p.topic}`;
    case "extra item not in any handout":
      if (p.topic) return `topic:${p.subject}:${p.topic}`;
      if (p.chapter) return `chapter:${p.subject}:${p.chapter}`;
      return `course:${p.subject}:${change.branch}`;
    default:
      return null;
  }
}

/** A new proposal for a change, before anyone's points are added. */
export function newProposal(change: Change, at: string): Proposal {
  return {
    id: proposalId(change),
    change: JSON.parse(JSON.stringify(change)) as Record<string, unknown>,
    type: change.type,
    subject: change.prism?.subject ?? change.to?.subject ?? "",
    branch: change.branch,
    semester: change.sem,
    status: "pending",
    points: 0,
    voters: 0,
    ...(targetKey(change) ? { targetKey: targetKey(change)! } : {}),
    createdAt: at,
    updatedAt: at,
  };
}

/** Add one student's vote. A second vote by the same student on one proposal changes nothing. */
export function addVote(proposal: Proposal, vote: Vote, alreadyVoted: boolean): Proposal {
  if (alreadyVoted) return proposal;
  return {
    ...proposal,
    points: proposal.points + vote.points,
    voters: proposal.voters + 1,
    updatedAt: vote.at,
  };
}
