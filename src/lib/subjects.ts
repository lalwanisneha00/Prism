import { TIERS } from "@/lib/tiers";
import { z } from "zod";
import branchData from "@/data/branches.json";
import { subjectFiles } from "@/data/subjects/index.generated";

/*
 * The subject catalogue (V3 · Step 2). Every subject is one JSON file in src/data/subjects/
 * (picked up automatically by scripts/build-subject-index.mjs), so adding a subject is adding
 * data, never code. A subject used by several branches is stored once and lists them all.
 * The whole catalogue is checked when the app loads: a typo fails loudly, not silently.
 */

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "ids must be lowercase-kebab-case");

const TopicSchema = z.object({
  id: slug,
  name: z.string().min(1),
  /** Topics to know first (same subject): the edges of the concept map. */
  requires: z.array(slug).optional(),
});
const ChapterSchema = z.object({
  id: slug,
  name: z.string().min(1),
  /** Teaching hours and marks for the unit, when the syllabus source gives them (V2.5). */
  hours: z.number().positive().optional(),
  marks: z.number().positive().optional(),
  topics: z.array(TopicSchema).min(1),
});

/** Where the chapter and topic list comes from (SPEC §12.1 rule 1: never from memory). */
const SyllabusSourceSchema = z.object({
  kind: z.enum(["aicte", "university", "textbook", "nptel", "none"]),
  title: z.string().min(1),
  url: z.url().optional(),
  /** What was checked, and anything still to check. */
  note: z.string().optional(),
});

/** The preferred kinds of visuals for a subject (SPEC §12.4), used by the visual planner. */
export const VISUAL_SETS = [
  "physics",
  "maths",
  "circuits",
  "mechanics",
  "thermal",
  "fluids",
  "signals",
  "computing",
  "chemistry",
  "civil",
  "process",
  "theory",
] as const;

export const SubjectSchema = z.object({
  id: slug,
  name: z.string().min(1),
  field: z.string().min(1),
  /** Trust tier (SPEC §6.1, §12.3). */
  tier: z.enum(TIERS),
  /** Branch ids that study it, or "all" for the first-year common core. */
  branches: z.array(z.string().min(1)).min(1),
  /** The semesters it is usually taught in (1–8). */
  semesters: z.array(z.int().min(1).max(8)).min(1),
  syllabusSource: SyllabusSourceSchema,
  visualSet: z.enum(VISUAL_SETS).optional(),
  /** How it is taught: "theory" (descriptive) or "skill" (practice activities). Optional. */
  teaching: z.enum(["theory", "skill"]).optional(),
  /**
   * Chapters of another subject that also belong to this one (shown here, but taught and
   * saved under their own subject, so nothing is copied). E.g. Applied Physics → E&M.
   */
  links: z.array(z.object({ subject: slug, chapters: z.array(slug).optional() })).optional(),
  chapters: z.array(ChapterSchema),
});

export type Topic = z.infer<typeof TopicSchema>;
export type Chapter = z.infer<typeof ChapterSchema>;
export type Subject = z.infer<typeof SubjectSchema>;

const BranchSchema = z.object({
  id: slug,
  name: z.string().min(1),
  short: z.string().min(1),
  wave: z.int().min(1).max(4),
});
export type Branch = z.infer<typeof BranchSchema>;

export const branches: readonly Branch[] = z
  .object({ branches: z.array(BranchSchema) })
  .parse(branchData).branches;

/** Problems in the catalogue as a whole (things one file can't check on its own). */
export function catalogueProblems(list: readonly Subject[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const branchIds = new Set(branches.map((b) => b.id));
  for (const s of list) {
    if (ids.has(s.id)) problems.push(`subject "${s.id}" appears twice`);
    ids.add(s.id);
    for (const b of s.branches) {
      if (b !== "all" && !branchIds.has(b)) problems.push(`${s.id}: unknown branch "${b}"`);
    }
    const chapterIds = new Set<string>();
    const topicIds = new Set<string>();
    for (const c of s.chapters) {
      if (chapterIds.has(c.id)) problems.push(`${s.id}: chapter "${c.id}" appears twice`);
      chapterIds.add(c.id);
      for (const t of c.topics) {
        if (topicIds.has(t.id)) problems.push(`${s.id}: topic "${t.id}" appears twice`);
        topicIds.add(t.id);
      }
    }
    for (const c of s.chapters) {
      for (const t of c.topics) {
        for (const r of t.requires ?? []) {
          if (!topicIds.has(r)) problems.push(`${s.id}: ${t.id} requires unknown topic "${r}"`);
        }
      }
    }
    if (s.chapters.length === 0 && !s.links?.length) {
      problems.push(`${s.id}: has no chapters and no linked chapters`);
    }
  }
  for (const s of list) {
    for (const link of s.links ?? []) {
      const other = list.find((x) => x.id === link.subject);
      if (!other) {
        problems.push(`${s.id}: links to unknown subject "${link.subject}"`);
        continue;
      }
      for (const c of link.chapters ?? []) {
        if (!other.chapters.some((x) => x.id === c)) {
          problems.push(`${s.id}: links to unknown chapter "${link.subject}/${c}"`);
        }
      }
    }
  }
  return problems;
}

function loadCatalogue(files: readonly unknown[]): Subject[] {
  const list = files.map((f, i) => {
    const parsed = SubjectSchema.safeParse(f);
    if (!parsed.success) {
      const id = (f as { id?: unknown })?.id;
      throw new Error(
        `Subject file ${typeof id === "string" ? id : `#${i + 1}`} is invalid: ${parsed.error.issues
          .slice(0, 5)
          .map((x) => `${x.path.join(".")}: ${x.message}`)
          .join("; ")}`,
      );
    }
    return parsed.data;
  });
  const problems = catalogueProblems(list);
  if (problems.length) throw new Error(`Subject catalogue problems: ${problems.join("; ")}`);
  return list;
}

/** Every subject the app teaches, checked when the app loads. */
export const subjects: readonly Subject[] = loadCatalogue(subjectFiles);

export function findSubject(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}

export function findChapter(subject: Subject, chapterId: string): Chapter | undefined {
  return subject.chapters.find((c) => c.id === chapterId);
}

export function findTopic(chapter: Chapter, topicId: string): Topic | undefined {
  return chapter.topics.find((t) => t.id === topicId);
}

export function findBranch(id: string): Branch | undefined {
  return branches.find((b) => b.id === id);
}

/** Subjects a branch studies (common first-year subjects included), optionally in one semester. */
export function subjectsFor(branchId: string, semester?: number): Subject[] {
  return subjects.filter(
    (s) =>
      (s.branches.includes("all") || s.branches.includes(branchId)) &&
      (semester === undefined || s.semesters.includes(semester)),
  );
}

/** The semesters in which a branch has at least one subject. */
export function semestersFor(branchId: string): number[] {
  return [...new Set(subjectsFor(branchId).flatMap((s) => s.semesters))].sort((a, b) => a - b);
}

/** The branches that study a subject ("all" expands to every branch). */
export function branchesOf(subject: Subject): Branch[] {
  return subject.branches.includes("all")
    ? [...branches]
    : branches.filter((b) => subject.branches.includes(b.id));
}

/**
 * A subject's chapters including the ones linked from other subjects, each with the subject
 * that owns it (lessons, progress and library keys always use the owner).
 */
export function chaptersOf(subject: Subject): { chapter: Chapter; owner: Subject }[] {
  const own = subject.chapters.map((chapter) => ({ chapter, owner: subject }));
  const linked = (subject.links ?? []).flatMap((link) => {
    const owner = findSubject(link.subject);
    if (!owner) return [];
    const chosen = link.chapters
      ? owner.chapters.filter((c) => link.chapters?.includes(c.id))
      : owner.chapters;
    return chosen.map((chapter) => ({ chapter, owner }));
  });
  return [...own, ...linked];
}
