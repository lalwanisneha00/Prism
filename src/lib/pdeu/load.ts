import overridesData from "@/data/pdeu/overrides.json";
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

type Overrides = {
  exclude: { branch: string; semester: number; code?: string; name?: string }[];
  categories: { match: string; category: "core" | "non-core" }[];
};
const overrides = overridesData as unknown as Overrides;

/** Practical and lab courses cannot be taught through Prism, so they are not listed. */
function isLab(c: { name: string; units: unknown[] }): boolean {
  return c.units.length === 0 && /\b(lab|laboratory|practical|practicals|workshop)\b/i.test(c.name);
}

/** The owner's decisions (src/data/pdeu/overrides.json): courses left out, and core / non-core calls. */
export function applyOverrides(branch: PdeuBranch): PdeuBranch {
  const rules = overrides.categories.map((r) => ({
    re: new RegExp(r.match, "i"),
    core: r.category === "core",
  }));
  const excluded = (semester: number, c: { code?: string; name: string }) =>
    overrides.exclude.some(
      (e) =>
        e.branch === branch.id &&
        e.semester === semester &&
        (e.code ? e.code === c.code : e.name === c.name),
    );
  return {
    ...branch,
    subjects: branch.subjects
      .filter((s) => !excluded(s.semester, s) && !isLab(s))
      .map((s) => {
        const rule = rules.find((r) => r.re.test(s.name));
        return rule ? { ...s, core: rule.core } : s;
      }),
  };
}

const cache = new Map<string, Promise<PdeuBranch>>();

/** A branch exactly as the handbook prints it (for checks against the PDF). */
export function loadRawPdeuBranch(id: PdeuBranchId): Promise<PdeuBranch> {
  return loaders[id]().then((m) => PdeuBranchSchema.parse(m.default));
}

/** A branch's PDEU syllabus with the owner's decisions applied, checked against its schema. */
export function loadPdeuBranch(id: PdeuBranchId): Promise<PdeuBranch> {
  const have = cache.get(id);
  if (have) return have;
  const p = loadRawPdeuBranch(id).then(applyOverrides);
  cache.set(id, p);
  return p;
}
