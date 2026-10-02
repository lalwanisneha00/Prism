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
  noteSummaries: z.object({
    ...syncFields,
    name: z.string().max(300),
    pages: z.number(),
    summary: z.string().max(600),
  }),
};
