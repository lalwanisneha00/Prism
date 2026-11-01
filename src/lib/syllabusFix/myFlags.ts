/*
 * The syllabus flags this student sent from this device (mock test overhaul). A flag needs other
 * students to agree before it changes the syllabus for everyone, but the student who sent it has
 * already told us: "this course isn't in my semester", "this topic isn't in my syllabus". Their own
 * mock tests skip those right away. Kept in the browser only (like a sticky note on your copy).
 */

export type MyFlag = {
  type: string;
  subject: string;
  chapter?: string;
  topic?: string;
  /** For "course-wrong-semester": the semester the student says it belongs to. */
  semester?: number;
  at: number;
};

export type HiddenByFlags = {
  subjects: Set<string>;
  /** "subject/chapter" */
  chapters: Set<string>;
  /** "subject/topic" */
  topics: Set<string>;
};

const KEY = "prism.myFlags";
const MAX = 200;

/** Reads a saved list, keeping only well-formed entries. */
export function parseMyFlags(raw: unknown): MyFlag[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((f): MyFlag[] => {
    if (typeof f !== "object" || f === null) return [];
    const r = f as Record<string, unknown>;
    if (typeof r.type !== "string" || typeof r.subject !== "string") return [];
    return [
      {
        type: r.type,
        subject: r.subject,
        ...(typeof r.chapter === "string" ? { chapter: r.chapter } : {}),
        ...(typeof r.topic === "string" ? { topic: r.topic } : {}),
        ...(typeof r.semester === "number" ? { semester: r.semester } : {}),
        at: typeof r.at === "number" ? r.at : 0,
      },
    ];
  });
}

/**
 * What the student's own flags take out of their view in a given semester: courses they said are
 * taught in another semester or not in their branch, chapters they said belong to another course,
 * topics they said aren't in the syllabus.
 */
export function hiddenByFlags(flags: readonly MyFlag[], semester?: number): HiddenByFlags {
  const hidden: HiddenByFlags = { subjects: new Set(), chapters: new Set(), topics: new Set() };
  for (const f of flags) {
    if (f.type === "course-not-in-branch") hidden.subjects.add(f.subject);
    if (f.type === "course-wrong-semester" && f.semester !== undefined && f.semester !== semester)
      hidden.subjects.add(f.subject);
    if (f.type === "chapter-wrong-course" && f.chapter)
      hidden.chapters.add(`${f.subject}/${f.chapter}`);
    if (f.type === "topic-not-in-syllabus" && f.topic) hidden.topics.add(`${f.subject}/${f.topic}`);
  }
  return hidden;
}

export function loadMyFlags(): MyFlag[] {
  try {
    return parseMyFlags(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    return [];
  }
}

/** Remembers a flag the server accepted (newest kept; the same flag twice is stored once). */
export function rememberMyFlag(flag: Omit<MyFlag, "at">, now = Date.now()): void {
  try {
    const same = (f: MyFlag) =>
      f.type === flag.type &&
      f.subject === flag.subject &&
      f.chapter === flag.chapter &&
      f.topic === flag.topic;
    const list = [{ ...flag, at: now }, ...loadMyFlags().filter((f) => !same(f))].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage blocked: the flag still counts on the server.
  }
}
