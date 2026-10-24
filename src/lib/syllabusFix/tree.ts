import { z } from "zod";

/*
 * The syllabus as a tree (syllabus fix, Phase 1): Branch → Semester → Course → Chapter → Topic.
 * The tree itself is the nesting in the subject files (a chapter's parent is the subject it sits in,
 * its order is its place in the array), so only the facts nesting can't show are added: where a node
 * came from, how sure we are of it, and whether it is still taught. Every field is optional and a
 * missing one is inherited from the parent, so old files stay valid and nothing is rebuilt.
 */

/** Where a node came from. */
export const NODE_SOURCES = [
  "official_site",
  "admin_handout",
  "student_handout",
  "student_fix",
] as const;
/** How sure we are of it. */
export const CONFIDENCES = ["unverified", "pending", "verified"] as const;
/** "retired" is a soft delete: hidden from lists, but saved progress and lookups by id still work. */
export const NODE_STATUSES = ["active", "retired"] as const;

export type NodeSource = (typeof NODE_SOURCES)[number];
export type Confidence = (typeof CONFIDENCES)[number];
export type NodeStatus = (typeof NODE_STATUSES)[number];

/** The fields every node (course, chapter, topic) may carry. */
export const nodeMetaFields = {
  source: z.enum(NODE_SOURCES).optional(),
  confidence: z.enum(CONFIDENCES).optional(),
  status: z.enum(NODE_STATUSES).optional(),
  /** How many students confirmed it (Phase 5 voting). */
  verifiedByCount: z.int().min(0).optional(),
};

/** Where a moved chapter or topic used to live, so links saved under the old place still resolve. */
export const MovedFromSchema = z.object({
  subject: z.string().min(1),
  chapter: z.string().min(1).optional(),
  at: z.string().min(1),
});

export type NodeMeta = {
  source?: NodeSource;
  confidence?: Confidence;
  status?: NodeStatus;
  verifiedByCount?: number;
};

export type ResolvedMeta = Required<NodeMeta>;

/** What the original data counts as when nothing is written (the old merged handbook). */
export const DEFAULT_META: ResolvedMeta = {
  source: "official_site",
  confidence: "unverified",
  status: "active",
  verifiedByCount: 0,
};

/**
 * The effective meta of a node: its own fields, else its chapter's, else its course's, else the
 * defaults. A retired course or chapter retires everything under it. The vote count is never
 * inherited (votes are for one node).
 */
export function resolveMeta(course: NodeMeta, chapter?: NodeMeta, topic?: NodeMeta): ResolvedMeta {
  const chain = [topic, chapter, course].filter((m): m is NodeMeta => m !== undefined);
  const own = chain[0] ?? course;
  return {
    source: chain.find((m) => m.source)?.source ?? DEFAULT_META.source,
    confidence: chain.find((m) => m.confidence)?.confidence ?? DEFAULT_META.confidence,
    status: chain.some((m) => m.status === "retired") ? "retired" : "active",
    verifiedByCount: own.verifiedByCount ?? 0,
  };
}

export function isRetired(meta: NodeMeta | undefined): boolean {
  return meta?.status === "retired";
}
