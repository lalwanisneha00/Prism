import { PdeuBranchSchema, type PdeuBranch } from "@/lib/pdeu/types";

/** The branches PDEU's handbook covers here. Others are shown the usual Prism way. */
export const PDEU_BRANCH_IDS = ["ce", "ict", "ece", "civil", "petro", "biotech", "me"] as const;
export type PdeuBranchId = (typeof PDEU_BRANCH_IDS)[number];

export function isPdeuBranch(id: string | undefined): id is PdeuBranchId {
  return !!id && (PDEU_BRANCH_IDS as readonly string[]).includes(id);
}

// One import per branch so only the student's own branch is downloaded (about 170 KB of text).
const loaders: Record<PdeuBranchId, () => Promise<{ default: unknown }>> = {
  ce: () => import("@/data/pdeu/ce.json"),
  ict: () => import("@/data/pdeu/ict.json"),
  ece: () => import("@/data/pdeu/ece.json"),
  civil: () => import("@/data/pdeu/civil.json"),
  petro: () => import("@/data/pdeu/petro.json"),
  biotech: () => import("@/data/pdeu/biotech.json"),
  me: () => import("@/data/pdeu/me.json"),
};

const cache = new Map<string, Promise<PdeuBranch>>();

/** A branch's whole PDEU syllabus, checked against its schema the first time it is loaded. */
export function loadPdeuBranch(id: PdeuBranchId): Promise<PdeuBranch> {
  const have = cache.get(id);
  if (have) return have;
  const p = loaders[id]().then((m) => PdeuBranchSchema.parse(m.default));
  cache.set(id, p);
  return p;
}
