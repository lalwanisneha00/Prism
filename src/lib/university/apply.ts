import { chaptersFromDraft, guessTeaching } from "@/lib/custom/customSubject";
import { createCustomSubject } from "@/lib/custom/store";
import { addSubjectToSemester, getMySubjects, saveMySubjects } from "@/lib/semester/mySemester";
import { getSettings, updateSettings } from "@/lib/storage/progress";
import type { Subject } from "@/lib/subjects";
import {
  mergeScopes,
  scopeFor,
  type SubjectScope,
  type SubjectScopes,
} from "@/lib/university/match";
import type { UniSubject } from "@/lib/university/parse";

/*
 * Applying a reviewed university syllabus: the subjects the student studies each semester, which
 * chapters and topics of each built-in subject their university teaches, and a subject of their own
 * for anything Prism doesn't teach. Planning is pure (and tested); saving goes through their
 * synced settings and their own subjects.
 */

export type ReviewChoice =
  { kind: "built-in"; subjectId: string } | { kind: "own" } | { kind: "skip" };

export type ReviewEntry = {
  uni: UniSubject;
  /** 1–8; without one the subject is scoped but not placed in a semester. */
  semester?: number;
  choice: ReviewChoice;
  /** Chapter ids of the built-in subject the student unticked in the review. */
  hiddenChapters?: string[];
};

export type ApplyPlan = {
  /** Built-in subject ids per semester, in the order of the syllabus. */
  picks: Record<string, string[]>;
  scopes: SubjectScopes;
  own: { uni: UniSubject; semester?: number }[];
};

export function planApply(
  entries: readonly ReviewEntry[],
  catalogue: readonly Subject[],
): ApplyPlan {
  const picks: Record<string, string[]> = {};
  const own: ApplyPlan["own"] = [];
  const bySubject = new Map<string, ReviewEntry[]>();
  for (const e of entries) {
    if (e.choice.kind === "skip") continue;
    if (e.choice.kind === "own") {
      own.push({ uni: e.uni, semester: e.semester });
      continue;
    }
    const id = e.choice.subjectId;
    bySubject.set(id, [...(bySubject.get(id) ?? []), e]);
    if (e.semester) {
      const key = String(e.semester);
      picks[key] = [...new Set([...(picks[key] ?? []), id])];
    }
  }

  const scopes: SubjectScopes = {};
  for (const [id, list] of bySubject) {
    const subject = catalogue.find((s) => s.id === id);
    if (!subject) continue;
    let scope: SubjectScope | undefined = scopeFor(subject, [list[0].uni]);
    for (const e of list.slice(1)) scope = mergeScopes(scope, scopeFor(subject, [e.uni]));
    const hidden = new Set(list.flatMap((e) => e.hiddenChapters ?? []));
    if (hidden.size > 0) {
      const base: SubjectScope =
        scope ?? Object.fromEntries(subject.chapters.map((c) => [c.id, c.topics.map((t) => t.id)]));
      scope = Object.fromEntries(
        Object.entries(base).filter(([chapterId]) => !hidden.has(chapterId)),
      );
    }
    if (scope && Object.keys(scope).length > 0) scopes[id] = scope;
  }
  return { picks, scopes, own };
}

/** Saves a reviewed syllabus. Returns how many subjects were scoped and how many were created. */
export async function applyUniversity(
  name: string,
  entries: readonly ReviewEntry[],
  catalogue: readonly Subject[],
): Promise<{ scoped: number; created: number }> {
  const plan = planApply(entries, catalogue);
  const mine = await getMySubjects();
  // The semesters this syllabus covers take its subjects; other semesters are left alone.
  const next = { ...mine, ...plan.picks };
  await saveMySubjects(next);
  const existing = (await getSettings())?.universityScope ?? {};
  await updateSettings({
    universityScope: { ...existing, ...plan.scopes },
    universityName: name.slice(0, 160),
    universityOff: false,
  });
  let created = 0;
  for (const o of plan.own) {
    const chapters = chaptersFromDraft(o.uni.units);
    if (chapters.length === 0) continue;
    const record = await createCustomSubject({
      name: o.uni.name.slice(0, 120),
      teaching: guessTeaching(o.uni.name),
      chapters,
      details: o.semester ? { semester: o.semester } : {},
      outlineFrom: "syllabus",
    });
    created++;
    if (o.semester) await addSubjectToSemester(o.semester, record.id);
  }
  return { scoped: Object.keys(plan.scopes).length, created };
}

/** Removes the applied university syllabus's scope (the student's own subjects and picks stay). */
export async function clearUniversity(): Promise<void> {
  await updateSettings({ universityScope: {}, universityName: "", universityOff: false });
}

export async function setUniversityOff(off: boolean): Promise<void> {
  await updateSettings({ universityOff: off });
}
