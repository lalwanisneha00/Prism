import { nameSimilarity } from "@/lib/university/match";

/*
 * "My subject isn't here" (syllabus fix, Phase 4): before a new course is suggested, look for the
 * same course elsewhere on Prism (often under another branch), so the student can say "it's this
 * one" and it gets linked instead of copied. Pure: the route passes the catalogue.
 */

type CourseLike = {
  id: string;
  name: string;
  code?: string;
  offerings?: readonly { branch: string; semester: number; code?: string }[];
};

export type Candidate = {
  id: string;
  name: string;
  /** Where Prism teaches it now, e.g. ["ece 3", "ict 3"]. */
  where: string[];
  /** Already listed for the student's branch and this semester. */
  alreadyHere: boolean;
  how: "code" | "name";
};

/** Names this close count as "maybe the same course". */
export const CANDIDATE_NAME = 0.6;

const plainCode = (c: string | undefined) => (c ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Courses that may be the one the student is missing: same code first, then close names. */
export function findCandidates(
  wanted: { name: string; code?: string; semester: number },
  branch: string | undefined,
  courses: readonly CourseLike[],
  limit = 4,
): Candidate[] {
  const code = plainCode(wanted.code);
  const scored: (Candidate & { score: number })[] = [];
  for (const c of courses) {
    const codes = [c.code, ...(c.offerings ?? []).map((o) => o.code)].map(plainCode);
    const byCode = code.length >= 5 && codes.includes(code);
    const score = byCode ? 2 : nameSimilarity(wanted.name, c.name);
    if (!byCode && score < CANDIDATE_NAME) continue;
    const offerings = c.offerings ?? [];
    scored.push({
      id: c.id,
      name: c.name,
      where: [...new Set(offerings.map((o) => `${o.branch} ${o.semester}`))],
      alreadyHere: offerings.some((o) => o.branch === branch && o.semester === wanted.semester),
      how: byCode ? "code" : "name",
      score,
    });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      name: c.name,
      where: c.where,
      alreadyHere: c.alreadyHere,
      how: c.how,
    }));
}
