import { z } from "zod";
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
                id: z.string().max(80),
                kind: z.enum(["learn", "revise", "flashcards"]),
                topicId: z.string().max(80).optional(),
                minutes: z.number(),
                done: z.boolean(),
                doneAt: z.number().optional(),
              }),
            )
            .max(30),
        }),
      )
      .max(60),
    overflow: z.array(z.string().max(80)).max(200),
    createdAt: z.number(),
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
