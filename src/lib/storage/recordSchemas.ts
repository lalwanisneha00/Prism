import { z } from "zod";
import { CustomChapterSchema, CustomDetailsSchema } from "@/lib/custom/customSubject";
import type { SyncedCollection } from "@/lib/storage/db";

/*
 * Shapes of synced records, checked whenever data arrives from outside this device
 * (the cloud copy or a backup file) before it is stored.
 */

export const syncFields = { id: z.string(), updatedAt: z.number(), deleted: z.boolean() };

export const recordSchemas: Record<Exclude<SyncedCollection, "savedLessons">, z.ZodType> = {
  recentTopics: z.object({
    ...syncFields,
    subject: z.string(),
    chapter: z.string(),
    topic: z.string(),
    level: z.string(),
    duration: z.number(),
    title: z.string(),
    chapterName: z.string(),
    viewedAt: z.number(),
  }),
  quizAttempts: z.object({
    ...syncFields,
    lessonId: z.string(),
    subject: z.string(),
    chapter: z.string(),
    topic: z.string(),
    level: z.string(),
    duration: z.number(),
    title: z.string(),
    score: z.number(),
    total: z.number(),
    at: z.number(),
  }),
  audioPositions: z.object({ ...syncFields, title: z.string(), seconds: z.number() }),
  customSubjects: z.object({
    ...syncFields,
    name: z.string().max(120),
    teaching: z.enum(["theory", "skill"]),
    chapters: z.array(CustomChapterSchema).max(30),
    details: CustomDetailsSchema,
    outlineFrom: z.enum(["typed", "syllabus", "material"]),
    createdAt: z.number(),
  }),
  mockResults: z.object({
    ...syncFields,
    subject: z.string().max(80),
    chapter: z.string().max(80),
    level: z.string().max(40),
    minutes: z.number(),
    title: z.string().max(300),
    score: z.number(),
    total: z.number(),
    byTopic: z
      .array(z.object({ topic: z.string().max(80), score: z.number(), total: z.number() }))
      .max(40),
    at: z.number(),
  }),
  settings: z.object({
    ...syncFields,
    theme: z.enum(["light", "dark"]).optional(),
    audioRate: z.number().min(0.5).max(3).optional(),
    branch: z.string().max(40).optional(),
    semester: z.int().min(1).max(8).optional(),
    importanceOverrides: z
      .record(z.string().max(200), z.enum(["high", "medium", "low"]))
      .refine((r) => Object.keys(r).length <= 2000)
      .optional(),
    plannerPrefs: z
      .object({
        rangeMin: z.number().min(1).max(240),
        rangeMax: z.number().min(1).max(240),
        weekMinutes: z.array(z.number().min(0).max(480)).length(7),
        collegeDays: z.array(z.int().min(0).max(6)).max(7),
        collegeMinutes: z.number().min(0).max(480),
        offMinutes: z.number().min(0).max(480),
        sessionMinutes: z.number().min(10).max(180),
        shortBreak: z.number().min(0).max(60),
        longBreak: z.number().min(0).max(120),
      })
      .optional(),
  }),
  learningSignals: z.object({
    ...syncFields,
    kind: z.enum(["wrong", "simpler"]),
    subject: z.string().max(80),
    topic: z.string().max(80),
    question: z.string().max(200).optional(),
    questionType: z.enum(["numerical", "conceptual"]).optional(),
    at: z.number(),
  }),
  flashcards: z.object({
    ...syncFields,
    front: z.string().max(2000),
    back: z.string().max(4000),
    subject: z.string(),
    chapter: z.string(),
    topic: z.string(),
    origin: z.enum(["glossary", "quiz", "misconception", "selection", "manual", "highlight"]),
    createdAt: z.number(),
    srs: z.object({
      due: z.number(),
      interval: z.number(),
      ease: z.number(),
      reps: z.number(),
      lapses: z.number(),
      lastReviewed: z.number().optional(),
    }),
  }),
  annotations: z.object({
    ...syncFields,
    lessonId: z.string().max(200),
    lessonVersion: z.string().max(40),
    subject: z.string(),
    chapter: z.string(),
    topic: z.string(),
    level: z.string(),
    duration: z.number(),
    title: z.string().max(300),
    fromNotes: z.boolean().optional(),
    block: z.string().max(120),
    sectionId: z.string().max(120).optional(),
    color: z.enum(["important", "confused", "formula", "exam"]).optional(),
    anchor: z
      .object({
        start: z.number(),
        end: z.number(),
        quote: z.string().max(4000),
        prefix: z.string().max(100),
        suffix: z.string().max(100),
      })
      .optional(),
    comment: z.string().max(1200),
    createdAt: z.number(),
  }),
  plans: z.object({
    ...syncFields,
    subject: z.string(),
    level: z.string(),
    lessonMinutes: z.number(),
    minutesPerDay: z.number(),
    startDate: z.string().max(10),
    examDate: z.string().max(10).optional(),
    days: z
      .array(
        z.object({
          date: z.string().max(10),
          items: z
            .array(
              z.object({
                id: z.string().max(200),
                kind: z.enum(["learn", "revise", "flashcards", "final-revision", "mock-test"]),
                topicId: z.string().max(80).optional(),
                subject: z.string().max(80).optional(),
                minutes: z.number(),
                done: z.boolean(),
                doneAt: z.number().optional(),
                tags: z.array(z.string().max(20)).max(6).optional(),
                adjusted: z.boolean().optional(),
              }),
            )
            .max(40),
          available: z.number().min(0).max(480).optional(),
          sessions: z
            .array(
              z.object({ itemIds: z.array(z.string().max(200)).max(40), breakAfter: z.number() }),
            )
            .max(20)
            .optional(),
        }),
      )
      .max(120),
    overflow: z.array(z.string().max(200)).max(500),
    createdAt: z.number(),
    version: z.literal(2).optional(),
    subjects: z.array(z.string().max(80)).max(20).optional(),
    title: z.string().max(120).optional(),
    range: z.object({ min: z.number(), max: z.number() }).optional(),
    weekMinutes: z.array(z.number().min(0).max(480)).length(7).optional(),
    overrides: z
      .record(z.string().max(10), z.number().min(0).max(480))
      .refine((r) => Object.keys(r).length <= 366)
      .optional(),
    breaks: z
      .object({
        sessionMinutes: z.number(),
        shortBreak: z.number(),
        longBreak: z.number(),
        longBreakEvery: z.number(),
      })
      .optional(),
    flashcards: z.boolean().optional(),
    finalReview: z.boolean().optional(),
  }),
  noteSummaries: z.object({
    ...syncFields,
    name: z.string().max(300),
    pages: z.number(),
    summary: z.string().max(600),
    kind: z.enum(["notes", "slides", "pyq", "worksheet", "syllabus"]).optional(),
    subject: z.string().max(80).optional(),
    chapter: z.string().max(80).optional(),
  }),
};
