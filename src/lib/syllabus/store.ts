import { chaptersFromDraft, guessTeaching } from "@/lib/custom/customSubject";
import { createCustomSubject, listCustomSubjects } from "@/lib/custom/store";
import { getMySubjects, saveMySubjects, SEMESTER_CHANGED_EVENT } from "@/lib/semester/mySemester";
import { getSettings, updateSettings } from "@/lib/storage/progress";
import type { Subject } from "@/lib/subjects";
import { coverageOf } from "@/lib/syllabus/propose";
import type { StoredSemester, StoredSubject, SyllabusByTerm } from "@/lib/syllabus/types";
import type { UniSubject } from "@/lib/university/parse";

/*
 * Saving a student's semester syllabus: the decisions they confirmed become the stored syllabus
 * (in their synced settings), their semester's subject list, and a subject of their own for anything
 * Prism does not teach. Building the stored record is pure and tested; saving goes through the
 * queued settings writer so quick changes never overwrite each other.
 */

export type Choice =
  | { kind: "prism"; subjectId: string; by: "auto" | "confirmed" }
  | { kind: "own" }
  | { kind: "skip" };

export type Decision = { uni: UniSubject; choice: Choice };

const MAX_LEN = 400;

/** The stored record for a semester (pure). `customIds` maps a syllabus subject's name to its own-subject id. */
export function buildSemester(
  semester: number,
  decisions: readonly Decision[],
  catalogue: readonly Subject[],
  options: {
    fileName?: string;
    labs?: string[];
    customIds?: ReadonlyMap<string, string>;
    now?: number;
  } = {},
): StoredSemester {
  const subjects: StoredSubject[] = [];
  for (const { uni, choice } of decisions) {
    if (choice.kind === "skip") continue;
    const base = {
      name: uni.name.slice(0, 160),
      ...(uni.code ? { code: uni.code.slice(0, 24) } : {}),
      ...(uni.credits ? { credits: uni.credits } : {}),
      outcomes: uni.outcomes.slice(0, 12).map((o) => o.slice(0, MAX_LEN)),
      unitCount: Math.min(40, uni.units.length),
      topicCount: Math.min(
        600,
        uni.units.reduce((n, u) => n + u.topics.length, 0),
      ),
      unclear: uni.unclear.slice(0, 6),
    };
    if (choice.kind === "own") {
      subjects.push({
        ...base,
        match: { kind: "own", customId: options.customIds?.get(uni.name.toLowerCase()) },
      });
      continue;
    }
    const subject = catalogue.find((s) => s.id === choice.subjectId);
    if (!subject) continue;
    const { covered, extra } = coverageOf(subject, uni);
    subjects.push({
      ...base,
      match: { kind: "prism", subjectId: choice.subjectId, covered, extra, by: choice.by },
    });
  }
  return {
    semester,
    uploadedAt: options.now ?? Date.now(),
    ...(options.fileName ? { fileName: options.fileName.slice(0, 160) } : {}),
    subjects: subjects.slice(0, 40),
    labs: (options.labs ?? []).slice(0, 20).map((l) => l.slice(0, 160)),
  };
}

/** The subject ids (Prism's and the student's own) a stored semester put on their list. */
export function idsOf(term: StoredSemester | undefined): string[] {
  const ids: string[] = [];
  for (const s of term?.subjects ?? []) {
    if (s.match.kind === "prism") ids.push(s.match.subjectId);
    else if (s.match.customId) ids.push(s.match.customId);
  }
  return [...new Set(ids)];
}

export async function getSyllabus(): Promise<SyllabusByTerm> {
  return (await getSettings())?.syllabus ?? {};
}

/**
 * Saves a semester's reviewed syllabus: stores it, puts its subjects on that semester's list (a
 * re-upload replaces the previous upload's subjects, never the ones the student added by hand), and
 * creates a subject of their own for each one Prism does not teach.
 */
export async function applySemester(
  semester: number,
  decisions: readonly Decision[],
  catalogue: readonly Subject[],
  options: { fileName?: string; labs?: string[] } = {},
): Promise<{ stored: StoredSemester; created: number }> {
  const customIds = new Map<string, string>();
  let created = 0;
  const existing = await listCustomSubjects();
  for (const { uni, choice } of decisions) {
    if (choice.kind !== "own") continue;
    const key = uni.name.toLowerCase();
    const have = existing.find((r) => r.name.toLowerCase() === key);
    if (have) {
      customIds.set(key, have.id);
      continue;
    }
    const record = await createCustomSubject({
      name: uni.name.slice(0, 120),
      teaching: guessTeaching(uni.name),
      chapters: chaptersFromDraft(uni.units),
      details: { semester },
      outlineFrom: "syllabus",
    });
    customIds.set(key, record.id);
    created++;
  }
  const stored = buildSemester(semester, decisions, catalogue, { ...options, customIds });

  const all = await getSyllabus();
  const previous = idsOf(all[String(semester)]);
  const picks = await getMySubjects();
  const kept = (picks[String(semester)] ?? []).filter((id) => !previous.includes(id));
  await saveMySubjects({ ...picks, [String(semester)]: [...new Set([...kept, ...idsOf(stored)])] });
  await updateSettings({ syllabus: { ...all, [String(semester)]: stored }, semester });
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SEMESTER_CHANGED_EVENT));
  return { stored, created };
}

/** Forgets one semester's uploaded syllabus and the subjects it added (hand-picked ones stay). */
export async function removeSemester(semester: number): Promise<void> {
  const all = await getSyllabus();
  const term = all[String(semester)];
  if (!term) return;
  const picks = await getMySubjects();
  const drop = new Set(idsOf(term));
  await saveMySubjects({
    ...picks,
    [String(semester)]: (picks[String(semester)] ?? []).filter((id) => !drop.has(id)),
  });
  const next = { ...all };
  delete next[String(semester)];
  await updateSettings({ syllabus: next });
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SEMESTER_CHANGED_EVENT));
}
