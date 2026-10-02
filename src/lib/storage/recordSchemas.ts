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
  noteSummaries: z.object({
    ...syncFields,
    name: z.string().max(300),
    pages: z.number(),
    summary: z.string().max(600),
  }),
};
