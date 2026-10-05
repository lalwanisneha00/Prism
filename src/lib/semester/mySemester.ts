import { getSettings, updateSettings } from "@/lib/storage/progress";
import type { Subject } from "@/lib/subjects";

/*
 * "My subjects this semester": colleges differ (one teaches Engineering Biology in semester 1,
 * another in semester 2), so the student chooses which subjects they study each semester instead
 * of Prism guessing from a fixed table. Built-in subjects and the student's own subjects can be
 * mixed. Pure helpers here; saving goes through the student's synced settings.
 */

export type SemesterPicks = Record<string, string[]>;

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export function picksFor(picks: SemesterPicks | undefined, semester: number | undefined): string[] {
  return semester ? (picks?.[String(semester)] ?? []) : [];
}

/** The picks with one subject added or removed for a semester (no duplicates, order kept). */
export function withPick(
  picks: SemesterPicks | undefined,
  semester: number,
  subjectId: string,
  on: boolean,
): SemesterPicks {
  const key = String(semester);
  const current = picks?.[key] ?? [];
  const next = on
    ? current.includes(subjectId)
      ? current
      : [...current, subjectId]
    : current.filter((id) => id !== subjectId);
  return { ...picks, [key]: next };
}

/** Subjects the catalogue usually places in this semester (a hint, never a limit). */
export function usuallyInSemester(
  subjects: readonly Subject[],
  semester: number | undefined,
  branch?: string,
): Subject[] {
  if (!semester) return [];
  return subjects.filter(
    (s) =>
      s.semesters.includes(semester) &&
      (!branch || s.branches.includes("all") || s.branches.includes(branch)),
  );
}

/**
 * Non-core subjects that vary between colleges. `builtInId` marks the ones Prism already teaches
 * (so they are ticked from the catalogue); the rest become the student's own subject, built from
 * their syllabus or material.
 */
export const NON_CORE: readonly { name: string; builtInId?: string }[] = [
  { name: "Indian Knowledge System" },
  { name: "Environmental Science", builtInId: "environmental-science" },
  { name: "Organisational Behaviour" },
  { name: "Universal Human Values" },
  { name: "Professional Ethics" },
  { name: "Constitution of India" },
  { name: "Economics for Engineers" },
  { name: "Principles of Management" },
  { name: "English Communication" },
  { name: "Entrepreneurship and Innovation" },
  { name: "Design Thinking" },
  { name: "Disaster Management" },
  { name: "Cyber Security Awareness" },
];

export async function getMySubjects(): Promise<SemesterPicks> {
  return (await getSettings())?.mySubjects ?? {};
}

export async function saveMySubjects(picks: SemesterPicks): Promise<void> {
  await updateSettings({ mySubjects: picks });
}

/** Adds one subject to a semester's list (used when a new subject of the student's own is made). */
export async function addSubjectToSemester(semester: number, subjectId: string): Promise<void> {
  await saveMySubjects(withPick(await getMySubjects(), semester, subjectId, true));
}
