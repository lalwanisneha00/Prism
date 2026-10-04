import { z } from "zod";
import type { DraftChapter } from "@/lib/custom/syllabusText";
import type { Subject } from "@/lib/subjects";

/*
 * "Other subjects" (V3 · Step 4): a non-core subject the student sets up themselves
 * (Indian Knowledge System, Universal Human Values, English Communication…), whose syllabus
 * differs a lot between universities. It is stored in the student's own account and turned
 * into an ordinary Subject, so every feature (lessons, chapter lessons, quizzes, flashcards,
 * mock tests, planner, highlights) works with it unchanged.
 */

export const CUSTOM_PREFIX = "custom-";

/** One-tap name suggestions. They fill in the name only: no built-in syllabus comes with them. */
export const SUGGESTED_NAMES = [
  "Indian Knowledge System",
  "Environmental Science",
  "Universal Human Values",
  "Organisational Behaviour",
  "English Communication",
  "Constitution of India",
  "Professional Ethics",
  "Economics for Engineers",
  "Principles of Management",
] as const;

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const name = z.string().trim().min(1).max(120);

export const CustomChapterSchema = z.object({
  id: slug.max(80),
  name,
  hours: z.number().positive().max(200).optional(),
  topics: z
    .array(z.object({ id: slug.max(80), name }))
    .min(1)
    .max(40),
});

export const CustomDetailsSchema = z.object({
  examDate: z.iso.date().optional(),
  /** E.g. "2, 5 and 10 marks". */
  marksPattern: z.string().max(100).optional(),
  examStyle: z.enum(["theory", "mcq", "mixed"]).optional(),
  examKind: z.enum(["internal", "end-sem"]).optional(),
  /** Chapter ids in the next exam. */
  nextExam: z.array(slug.max(80)).max(30).optional(),
  semester: z.int().min(1).max(8).optional(),
  language: z.string().max(40).optional(),
});

/** What the server needs to teach a custom subject (sent with each request, size-checked). */
export const CustomSubjectPayloadSchema = z.object({
  id: z.string().startsWith(CUSTOM_PREFIX).max(80),
  name,
  /** "skill" subjects (English Communication…) get practice activities, not only explanation. */
  teaching: z.enum(["theory", "skill"]),
  hasMaterial: z.boolean(),
  chapters: z.array(CustomChapterSchema).min(1).max(30),
});
export type CustomSubjectPayload = z.infer<typeof CustomSubjectPayloadSchema>;

/** Lowercase-kebab ids from names, unique within their list. */
export function slugify(text: string, taken: Set<string> = new Set()): string {
  const base =
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item";
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  taken.add(id);
  return id;
}

/** Turns an edited outline into chapters with stable ids. */
export function chaptersFromDraft(
  draft: readonly DraftChapter[],
  /** The chapters before an edit: a unit or topic that keeps its name keeps its id (and progress). */
  previous: CustomSubjectPayload["chapters"] = [],
): CustomSubjectPayload["chapters"] {
  const chapterIds = new Set<string>();
  const topicIds = new Set<string>();
  const oldChapter = new Map(previous.map((c) => [c.name.trim().toLowerCase(), c.id]));
  const oldTopic = new Map(
    previous.flatMap((c) => c.topics.map((t) => [t.name.trim().toLowerCase(), t.id] as const)),
  );
  const reuse = (map: Map<string, string>, name: string, taken: Set<string>) => {
    const id = map.get(name.trim().toLowerCase());
    if (id && !taken.has(id)) {
      taken.add(id);
      return id;
    }
    return slugify(name, taken);
  };
  return draft
    .map((c) => ({
      ...c,
      name: c.name.trim(),
      topics: c.topics.map((t) => t.trim()).filter(Boolean),
    }))
    .filter((c) => c.name && c.topics.length > 0)
    .slice(0, 30)
    .map((c) => ({
      id: reuse(oldChapter, c.name, chapterIds),
      name: c.name.slice(0, 120),
      ...(c.hours ? { hours: c.hours } : {}),
      topics: c.topics
        .slice(0, 40)
        .map((t) => ({ id: reuse(oldTopic, t, topicIds), name: t.slice(0, 120) })),
    }));
}

/** Skill subjects are spotted by name (English, communication, writing…); the student can change it. */
export function guessTeaching(subjectName: string): "theory" | "skill" {
  return /\b(english|communication|writing|speaking|language|soft skills?)\b/i.test(subjectName)
    ? "skill"
    : "theory";
}

export function isCustomId(id: string): boolean {
  return id.startsWith(CUSTOM_PREFIX);
}

/**
 * A custom subject as an ordinary Subject. Its tier follows the accuracy rules: with the
 * student's material it is "sourced" (their material comes first, free trusted sources add
 * to it); with only a name and topics it is "limited" until material is added.
 */
export function toSubject(c: CustomSubjectPayload): Subject {
  return {
    id: c.id,
    name: c.name,
    field: c.teaching === "skill" ? "Skills (my subject)" : "My subject",
    tier: c.hasMaterial ? "sourced" : "limited",
    branches: ["all"],
    semesters: [1],
    syllabusSource: { kind: "none", title: "Your own syllabus" },
    visualSet: "theory",
    teaching: c.teaching,
    chapters: c.chapters.map((ch) => ({
      id: ch.id,
      name: ch.name,
      ...(ch.hours ? { hours: ch.hours } : {}),
      topics: ch.topics.map((t) => ({ id: t.id, name: t.name })),
    })),
  };
}
