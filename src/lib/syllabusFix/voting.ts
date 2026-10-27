import { SYLLABUS_FIX_CONFIG } from "@/lib/syllabusFix/config";
import type { ChangeType } from "@/lib/syllabusFix/handoutMatch";
import type { Proposal, Vote } from "@/lib/syllabusFix/proposals";

/*
 * The voting rules (syllabus fix, Phase 5), all pure. Think of a class vote: only students of that
 * class (same branch and semester, and batch when the course says which batches) raise a hand,
 * each hand counts once, and a change passes with enough points from at least two students, unless
 * another strong suggestion says the opposite, in which case the teacher (admin) decides.
 */

/** The numbers the rules use (tests pass other values to try them). */
type Config = {
  autoApply: { minPoints: number; minUsers: number };
  conflict: { minRivalPoints: number };
  countDeviceProfiles: boolean;
};

/** Changes the engine may make on its own. The rest need the admin (new ids, other courses). */
export const AUTO_APPLY_TYPES: readonly ChangeType[] = [
  "course missing from branch/semester",
  "course in wrong semester",
  "course in wrong branch",
  "unit wrong order",
  "unit rename",
  "topic under wrong unit",
  "topic missing",
  "topic split",
  "extra item not in any handout",
];

const NO_ONE: ReadonlySet<string> = new Set();

/**
 * Why a vote does or does not count for a proposal. `paused` = students whose fixes were reverted
 * too often (Phase 6): their votes are kept but no longer count.
 */
export function voteCounts(
  vote: Vote,
  proposal: Pick<Proposal, "branch" | "semester">,
  course: { batchYears?: readonly number[] } = {},
  config: Config = SYLLABUS_FIX_CONFIG,
  paused: ReadonlySet<string> = NO_ONE,
): { counts: true } | { counts: false; reason: string } {
  if (vote.kind === "unsure") return { counts: false, reason: "not sure" };
  if (paused.has(vote.uid)) return { counts: false, reason: "votes paused" };
  if (!config.countDeviceProfiles && vote.profileFrom !== "cloud")
    return { counts: false, reason: "profile not synced" };
  if (vote.branch !== proposal.branch) return { counts: false, reason: "other branch" };
  if (vote.semester !== proposal.semester) return { counts: false, reason: "other semester" };
  // A course written for some batches only: a student of another batch has a different syllabus.
  if (course.batchYears?.length && vote.batchYear && !course.batchYears.includes(vote.batchYear))
    return { counts: false, reason: "other batch" };
  return { counts: true };
}

export type Tally = {
  /** Points from votes that count. */
  points: number;
  /** Different students whose vote counts and adds points (agree, flag, handout). */
  supporters: number;
  /** Votes left out, with why (for the admin page). */
  ignored: { uid: string; reason: string }[];
};

/** The points of a proposal from its votes, counting each student once. */
export function tally(
  proposal: Pick<Proposal, "branch" | "semester">,
  votes: readonly Vote[],
  course: { batchYears?: readonly number[] } = {},
  config: Config = SYLLABUS_FIX_CONFIG,
  paused: ReadonlySet<string> = NO_ONE,
): Tally {
  const seen = new Set<string>();
  let points = 0;
  let supporters = 0;
  const ignored: Tally["ignored"] = [];
  for (const vote of votes) {
    if (seen.has(vote.uid)) continue;
    seen.add(vote.uid);
    const check = voteCounts(vote, proposal, course, config, paused);
    if (!check.counts) {
      ignored.push({ uid: vote.uid, reason: check.reason });
      continue;
    }
    points += vote.points;
    if (vote.points > 0) supporters++;
  }
  return { points, supporters, ignored };
}

export type Verdict =
  | { action: "wait" }
  | { action: "apply" }
  /** Enough support, but only the admin can make this kind of change. */
  | { action: "review" }
  /** A rival is strong too: neither goes live. `rivals` = the strong rivals' ids. */
  | { action: "conflict"; rivals: string[] };

/**
 * What happens to a pending proposal now. `rivals` = other pending proposals about the same thing
 * (same `targetKey`), with their counted points.
 */
export function decide(
  proposal: Pick<Proposal, "status" | "type">,
  count: Tally,
  rivals: readonly { id: string; points: number }[],
  config: Config = SYLLABUS_FIX_CONFIG,
): Verdict {
  if (proposal.status !== "pending") return { action: "wait" };
  const enough =
    count.points >= config.autoApply.minPoints && count.supporters >= config.autoApply.minUsers;
  if (!enough) return { action: "wait" };
  const strong = rivals.filter((r) => r.points >= config.conflict.minRivalPoints).map((r) => r.id);
  if (strong.length > 0) return { action: "conflict", rivals: strong };
  if (!AUTO_APPLY_TYPES.includes(proposal.type as ChangeType)) return { action: "review" };
  return { action: "apply" };
}

/** Names of the course, chapter and topic a change is about (looked up by the caller). */
export type ChangeNames = { course?: string; chapter?: string; topic?: string; toChapter?: string };

/**
 * One proposal in a student's words, for the "Agree?" prompt: "Information Theory belongs in
 * semester 5". No ids, no em dashes.
 */
export function plainChange(
  change: {
    type: string;
    sem: number;
    to?: { semester?: number; order?: number };
    handout?: { unit?: string; topic?: string; course?: string };
  },
  names: ChangeNames,
): string {
  const course = names.course ?? change.handout?.course ?? "This course";
  const topic = names.topic ? `"${names.topic}"` : "A topic";
  const chapter = names.chapter ? `"${names.chapter}"` : "a chapter";
  switch (change.type) {
    case "course in wrong semester":
      return `${course} is taught in semester ${change.to?.semester ?? change.sem}`;
    case "course missing from branch/semester":
      return `${course} is part of semester ${change.to?.semester ?? change.sem}`;
    case "course in wrong branch":
      return `${course} is not taught in this branch`;
    case "course duplicate":
      return `${course} is shown twice`;
    case "unit wrong order":
      return `The chapter ${chapter} of ${course} comes at position ${change.to?.order ?? "?"}`;
    case "unit rename":
      return `The chapter ${chapter} of ${course} is really called "${change.handout?.unit ?? ""}"`;
    case "unit missing":
      return `${course} is missing the chapter "${change.handout?.unit ?? ""}"`;
    case "unit under wrong course":
      return `The chapter ${chapter} belongs to ${course}`;
    case "topic under wrong unit":
      return `${topic} belongs in the chapter "${names.toChapter ?? ""}" of ${course}`;
    case "topic missing":
      return `${course} is missing the topic "${change.handout?.topic ?? ""}" in ${chapter}`;
    case "topic split":
      return `${topic} in ${course} is really several separate topics`;
    case "extra item not in any handout":
      return names.topic
        ? `${topic} is not in the syllabus of ${course}`
        : names.chapter
          ? `The chapter ${chapter} is not in the syllabus of ${course}`
          : `${course} is not taught in this semester`;
    case "new course":
    case "new practical course":
      return `"${change.handout?.course ?? "A course"}" is missing from semester ${change.sem}`;
    default:
      return `${course} needs a fix`;
  }
}
