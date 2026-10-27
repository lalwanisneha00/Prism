import { z } from "zod";
import type { Subject } from "@/lib/subjects";
import {
  branchHealth,
  canGoLive,
  nearThreshold,
  type BranchHealth,
} from "@/lib/syllabusFix/adminActions";
import type { AdminDashboard } from "@/lib/syllabusFix/adminStore";
import { LiveChangeSchema, type LiveChange } from "@/lib/syllabusFix/overlay";
import type { Proposal } from "@/lib/syllabusFix/proposals";

/*
 * The admin page's data (syllabus fix, Phase 6): the stored records turned into plain sentences
 * and names, so the page never shows raw ids it would have to explain. Pure; the route passes the
 * catalogue lookups in.
 */

export const NeedsReviewSchema = z.object({
  version: z.literal(1),
  items: z.array(
    z.object({
      id: z.string().min(1),
      branch: z.string(),
      sem: z.number(),
      reason: z.string(),
      detail: z.string(),
    }),
  ),
});
export type NeedsReviewItem = z.infer<typeof NeedsReviewSchema>["items"][number];

export type ProposalView = {
  id: string;
  text: string;
  type: string;
  course: string;
  branch: string;
  semester: number;
  points: number;
  voters: number;
  status: Proposal["status"];
  /** Approve makes it live now (else it waits for the next syllabus data update). */
  canGoLive: boolean;
  updatedAt: string;
};

export type AdminView = {
  recent: {
    proposalId: string;
    text: string;
    course: string;
    branch: string;
    semester: number;
    supporters: number;
    appliedAt: string;
    reverted: boolean;
  }[];
  conflicts: { key: string; items: ProposalView[] }[];
  review: ProposalView[];
  accepted: ProposalView[];
  near: ProposalView[];
  health: BranchHealth[];
  lessons: {
    lessonKey: string;
    course: string;
    topic: string;
    version: number;
    flags: number;
    regenerations: number;
    updatedAt: string;
  }[];
  quality: { subject: string; course: string; lessons: number; chapters: string[] }[];
  paused: { uid: string; reverts: number; updatedAt: string }[];
  needsReview: (NeedsReviewItem & { checkedAt?: string })[];
  rule: { minPoints: number; minUsers: number };
};

export type ViewLookups = {
  find: (id: string) => Subject | undefined;
  describe: (change: LiveChange) => string;
  catalogue: readonly Subject[];
  branches: readonly string[];
  needsReview: readonly NeedsReviewItem[];
  rule: { minPoints: number; minUsers: number };
};

const courseName = (find: ViewLookups["find"], id: string) => find(id)?.name ?? id;

function proposalView(p: Proposal, l: ViewLookups): ProposalView | null {
  const change = LiveChangeSchema.safeParse(p.change);
  if (!change.success) return null;
  return {
    id: p.id,
    text: l.describe(change.data),
    type: p.type,
    course: l.find(p.subject)?.name ?? change.data.handout?.course ?? p.subject,
    branch: p.branch,
    semester: p.semester,
    points: p.points,
    voters: p.voters,
    status: p.status,
    canGoLive: canGoLive(p.type),
    updatedAt: p.updatedAt,
  };
}

const views = (list: readonly Proposal[], l: ViewLookups) =>
  list.flatMap((p) => {
    const v = proposalView(p, l);
    return v ? [v] : [];
  });

export function adminView(d: AdminDashboard, l: ViewLookups): AdminView {
  const groups = new Map<string, Proposal[]>();
  for (const p of d.conflicts) {
    const key = p.targetKey ?? p.id;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return {
    recent: d.recent.map((a) => ({
      proposalId: a.proposalId,
      text: l.describe(a.change),
      course: courseName(l.find, a.change.prism?.subject ?? a.change.to?.subject ?? ""),
      branch: a.change.branch,
      semester: a.change.sem,
      supporters: a.supporters,
      appliedAt: a.appliedAt,
      reverted: Boolean(a.reverted),
    })),
    conflicts: [...groups].map(([key, items]) => ({ key, items: views(items, l) })),
    review: views(d.review, l),
    accepted: views(d.accepted, l),
    near: views(nearThreshold(d.pending), l),
    health: branchHealth(l.catalogue, d.overlay, l.branches),
    lessons: d.lessons.map((s) => {
      const subject = l.find(s.subject);
      const topic = subject?.chapters.flatMap((c) => c.topics).find((t) => t.id === s.topic);
      return {
        lessonKey: s.lessonKey,
        course: subject?.name ?? s.subject,
        topic: topic?.name ?? s.topic,
        version: s.version,
        flags: s.flaggedBy.length,
        regenerations: s.regenerations,
        updatedAt: s.updatedAt,
      };
    }),
    quality: d.quality.map((q) => {
      const subject = l.find(q.subject);
      return {
        subject: q.subject,
        course: subject?.name ?? q.subject,
        lessons: q.lessons,
        chapters: q.chapterWarnings.map(
          (id) => subject?.chapters.find((c) => c.id === id)?.name ?? id,
        ),
      };
    }),
    paused: d.paused.map((t) => ({
      uid: t.uid,
      reverts: t.revertedFixes.length,
      updatedAt: t.updatedAt,
    })),
    needsReview: l.needsReview.map((item) =>
      d.checked[item.id] ? { ...item, checkedAt: d.checked[item.id] } : item,
    ),
    rule: l.rule,
  };
}
