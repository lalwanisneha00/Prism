import { z } from "zod";
import type { Change } from "@/lib/syllabusFix/handoutMatch";
import { StudentHandoutSchema } from "@/lib/syllabusFix/studentHandout";

/*
 * Flags (syllabus fix, Phase 4): a small menu of "this is wrong" reports on a course, chapter or
 * topic, plus "My subject isn't here". Each flag becomes one Change, the same shape the handout
 * matcher writes, so it turns into (or adds 1 point to) a proposal. Like a handout, a flag never
 * changes the syllabus by itself: Phase 5 applies a proposal once enough students agree.
 * Pure: the routes check sign-in and save; the menus in the app use the labels.
 */

const note = z.string().trim().max(300).optional();
const id = z.string().trim().min(1).max(160);
const name = z.string().trim().min(2).max(160);

/** Course, chapter and topic flags. `choice` is the extra answer some flags ask for. */
export const SyllabusFlagSchema = z.discriminatedUnion("type", [
  // "Which semester is it in?"
  z.object({
    type: z.literal("course-wrong-semester"),
    subject: id,
    semester: z.int().min(1).max(8),
    note,
  }),
  z.object({ type: z.literal("course-not-in-branch"), subject: id, note }),
  // Optional: the course it repeats.
  z.object({ type: z.literal("course-duplicate"), subject: id, other: id.optional(), note }),
  z.object({
    type: z.literal("chapter-wrong-course"),
    subject: id,
    chapter: id,
    toSubject: id,
    note,
  }),
  z.object({
    type: z.literal("chapter-wrong-order"),
    subject: id,
    chapter: id,
    position: z.int().min(1).max(40),
    note,
  }),
  z.object({ type: z.literal("chapter-missing"), subject: id, name, note }),
  z.object({
    type: z.literal("topic-wrong-chapter"),
    subject: id,
    chapter: id,
    topic: id,
    toChapter: id,
    note,
  }),
  z.object({ type: z.literal("topic-not-in-syllabus"), subject: id, chapter: id, topic: id, note }),
  z.object({ type: z.literal("topic-missing"), subject: id, chapter: id, name, note }),
]);
export type SyllabusFlag = z.infer<typeof SyllabusFlagSchema>;
export type SyllabusFlagType = SyllabusFlag["type"];
export type FlagLevel = "course" | "chapter" | "topic";

/** The menu for each level, in the order it is shown. Labels are the student's words. */
export const FLAG_MENU: Record<FlagLevel, { type: SyllabusFlagType; label: string }[]> = {
  course: [
    { type: "course-wrong-semester", label: "Not in my semester" },
    { type: "course-not-in-branch", label: "Not in my branch at all" },
    { type: "course-duplicate", label: "Shown twice / duplicate" },
  ],
  chapter: [
    { type: "chapter-wrong-course", label: "Belongs to a different course" },
    { type: "chapter-wrong-order", label: "Wrong order" },
    { type: "chapter-missing", label: "A chapter is missing" },
  ],
  topic: [
    { type: "topic-wrong-chapter", label: "Belongs to a different chapter" },
    { type: "topic-not-in-syllabus", label: "Not in my syllabus" },
    { type: "topic-missing", label: "A topic is missing here" },
  ],
};

/** The course a flag is about, as much of it as a flag needs. */
export type FlagCourse = {
  id: string;
  name: string;
  code?: string;
  chapters: readonly {
    id: string;
    name: string;
    topics: readonly { id: string; name: string }[];
  }[];
};

/** Where the student studies (their profile): the branch and semester the change is for. */
export type FlagPlace = { branch: string; sem: number };

export type FlagResult = { ok: true; change: Change } | { ok: false; message: string };

const bad = (message: string): FlagResult => ({ ok: false, message });

/**
 * The change a flag asks for. Shaped like the matcher's changes, so a flag and a handout that ask
 * for the same thing (a topic not in the syllabus, a course in another semester) share a proposal.
 * `courses` = the other courses a chapter may move to (the student's branch).
 */
export function flagToChange(
  flag: SyllabusFlag,
  course: FlagCourse,
  place: FlagPlace,
  courses: readonly { id: string; name: string }[] = [],
): FlagResult {
  const base = { branch: place.branch, sem: place.sem };
  const ref = { course: course.name, code: course.code ?? null };
  const chapterOf = (chapterId: string) => course.chapters.find((c) => c.id === chapterId);
  switch (flag.type) {
    case "course-wrong-semester":
      if (flag.semester === place.sem) return bad("Pick a different semester from your own.");
      // Filed under the student's own semester: its students see the course in the wrong place,
      // so their flags and Agrees count; going live moves it to `to.semester` for this branch.
      return {
        ok: true,
        change: {
          branch: place.branch,
          sem: place.sem,
          type: "course in wrong semester",
          detail: `Move ${course.id} for ${place.branch} to sem ${flag.semester} (student flag)`,
          handout: ref,
          prism: { subject: course.id },
          to: { branch: place.branch, semester: flag.semester },
        },
      };
    case "course-not-in-branch":
      return {
        ok: true,
        change: {
          ...base,
          type: "course in wrong branch",
          detail: `Unlink ${course.id} from ${place.branch} (student flag: not taught in this branch)`,
          prism: { subject: course.id },
          retire: true,
        },
      };
    case "course-duplicate": {
      if (flag.other === course.id) return bad("Pick a different course.");
      const other = flag.other ? courses.find((c) => c.id === flag.other) : undefined;
      if (flag.other && !other) return bad("That course is not on Prism.");
      return {
        ok: true,
        change: {
          ...base,
          type: "course duplicate",
          detail: other
            ? `${course.id} repeats ${other.id} for ${place.branch} sem ${place.sem} (student flag)`
            : `${course.id} is shown twice for ${place.branch} sem ${place.sem} (student flag)`,
          prism: { subject: course.id },
          ...(other ? { to: { subject: other.id } } : {}),
        },
      };
    }
    case "chapter-wrong-course": {
      const chapter = chapterOf(flag.chapter);
      if (!chapter) return bad("That chapter is not in this course.");
      const target = courses.find((c) => c.id === flag.toSubject);
      if (!target || target.id === course.id) return bad("Pick the course it belongs to.");
      return {
        ok: true,
        change: {
          ...base,
          type: "unit under wrong course",
          detail: `Move chapter "${chapter.name}" from ${course.id} to ${target.id} (student flag)`,
          prism: { subject: course.id, chapter: chapter.id },
          to: { subject: target.id },
        },
      };
    }
    case "chapter-wrong-order": {
      const index = course.chapters.findIndex((c) => c.id === flag.chapter);
      if (index < 0) return bad("That chapter is not in this course.");
      if (flag.position > course.chapters.length) return bad("Pick a position in the list.");
      if (flag.position === index + 1) return bad("It is already in that position.");
      return {
        ok: true,
        change: {
          ...base,
          type: "unit wrong order",
          detail: `Move chapter "${course.chapters[index].name}" to position ${flag.position} (student flag)`,
          prism: { subject: course.id, chapter: flag.chapter },
          to: { order: flag.position },
        },
      };
    }
    case "chapter-missing":
      if (course.chapters.some((c) => sameText(c.name, flag.name)))
        return bad("This course already has a chapter with that name.");
      return {
        ok: true,
        change: {
          ...base,
          type: "unit missing",
          detail: `Add chapter "${flag.name}" to ${course.id} (student flag)`,
          handout: { ...ref, unit: flag.name },
          to: { subject: course.id },
        },
      };
    case "topic-wrong-chapter": {
      const from = chapterOf(flag.chapter);
      const topic = from?.topics.find((t) => t.id === flag.topic);
      const to = chapterOf(flag.toChapter);
      if (!from || !topic) return bad("That topic is not in this chapter.");
      if (!to || to.id === from.id) return bad("Pick the chapter it belongs to.");
      return {
        ok: true,
        change: {
          ...base,
          type: "topic under wrong unit",
          detail: `Move topic "${topic.name}" from chapter "${from.name}" to "${to.name}" (student flag)`,
          prism: { subject: course.id, chapter: from.id, topic: topic.id },
          to: { subject: course.id, chapter: to.id },
        },
      };
    }
    case "topic-not-in-syllabus": {
      const chapter = chapterOf(flag.chapter);
      const topic = chapter?.topics.find((t) => t.id === flag.topic);
      if (!chapter || !topic) return bad("That topic is not in this chapter.");
      // Same change (and so the same proposal) as a handout that leaves the topic out.
      return {
        ok: true,
        change: {
          ...base,
          type: "extra item not in any handout",
          detail: `Retire topic "${topic.name}" in chapter "${chapter.name}"`,
          handout: ref,
          prism: { subject: course.id, chapter: chapter.id, topic: topic.id },
          retire: true,
        },
      };
    }
    case "topic-missing": {
      const chapter = chapterOf(flag.chapter);
      if (!chapter) return bad("That chapter is not in this course.");
      if (chapter.topics.some((t) => sameText(t.name, flag.name)))
        return bad("This chapter already has that topic.");
      return {
        ok: true,
        change: {
          ...base,
          type: "topic missing",
          detail: `Add topic "${flag.name}" to chapter "${chapter.name}" (student flag)`,
          handout: { ...ref, unit: chapter.name, topic: flag.name },
          to: { subject: course.id, chapter: chapter.id },
        },
      };
    }
  }
}

const sameText = (a: string, b: string) =>
  a
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim() ===
  b
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/* ---------- "My subject isn't here" ---------- */

export const MissingSubjectSchema = z.object({
  name,
  code: z
    .string()
    .trim()
    .max(20)
    .regex(/^[A-Za-z0-9]*$/, "Letters and digits only")
    .optional(),
  semester: z.int().min(1).max(8),
  /** The Prism course the student said it is ("Is it this one?"): linked, not duplicated. */
  linkTo: id.optional(),
  /** Their handout's units, read on their device (optional). */
  handout: StudentHandoutSchema.optional(),
  note,
});
export type MissingSubject = z.infer<typeof MissingSubjectSchema>;

/** The change: link an existing course to the branch and semester, or add a new course. */
export function missingSubjectChange(
  missing: MissingSubject,
  branch: string,
  existing?: { id: string; name: string },
): Change {
  const ref = { course: missing.name, code: missing.code ? missing.code.toUpperCase() : null };
  if (existing)
    // The same change a handout makes for a course missing from the branch/semester.
    return {
      branch,
      sem: missing.semester,
      type: "course missing from branch/semester",
      detail: `Link ${existing.id} to ${branch} sem ${missing.semester} (student: my subject isn't here)`,
      handout: ref,
      prism: { subject: existing.id },
      to: { branch, semester: missing.semester },
    };
  const units = missing.handout?.units.length ?? 0;
  return {
    branch,
    sem: missing.semester,
    type: "new course",
    detail: `Add course "${missing.name}" (${ref.code ?? "no code"}${units ? `, ${units} units` : ""}) for ${branch} sem ${missing.semester} (student)`,
    handout: ref,
    to: { branch, semester: missing.semester },
  };
}

/* ---------- Lesson flags ---------- */

export const LESSON_FLAG_TYPES = [
  { type: "wrong-fact", label: "Wrong fact or explanation" },
  { type: "wrong-formula", label: "Wrong formula, value or unit" },
  { type: "off-syllabus", label: "Doesn't match my syllabus / goes off-topic" },
  { type: "visual-broken", label: "Visual or chart is wrong or broken" },
  { type: "confusing", label: "Confusing, hard to follow" },
  // Lab lessons only (Phase 7B): their interactive simulation.
  { type: "simulation-wrong", label: "Simulation is wrong or doesn't work", practicalOnly: true },
] as const;
export type LessonFlagType = (typeof LESSON_FLAG_TYPES)[number]["type"];

export const LessonFlagSchema = z.object({
  subject: id,
  topic: id,
  level: z.string().trim().min(1).max(40),
  durationMin: z.int().min(1).max(600),
  /** The lesson version the student read (Phase 5 adds new versions; today every lesson is 1). */
  version: z.int().min(1).max(1000).default(1),
  type: z.enum(LESSON_FLAG_TYPES.map((t) => t.type) as [LessonFlagType, ...LessonFlagType[]]),
  /** The exact part that is wrong, as the student selected it. */
  excerpt: z.string().trim().max(600).optional(),
  note,
});
export type LessonFlag = z.infer<typeof LessonFlagSchema>;

/** One flag per student per lesson version: flagging again replaces the earlier flag. */
export function lessonFlagId(
  flag: Pick<LessonFlag, "subject" | "topic" | "level" | "durationMin" | "version">,
  uid: string,
): string {
  return `${flag.subject}_${flag.topic}_${flag.level}_${flag.durationMin}__v${flag.version}__${uid}`;
}

/** Every course code a course is known by (its own and each branch's), for reading handouts. */
export function courseCodes(s: {
  code?: string;
  offerings?: readonly { code?: string }[];
}): string[] {
  return [
    ...new Set(
      [s.code, ...(s.offerings ?? []).map((o) => o.code)].filter((c): c is string => Boolean(c)),
    ),
  ];
}
