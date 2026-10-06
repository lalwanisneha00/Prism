import { z } from "zod";

/*
 * What Prism remembers about a student's uploaded semester syllabus (stored in their synced
 * settings, on their device and their account; never in the shared subject data). It keeps only
 * what the app needs: which Prism topics each syllabus subject covers, the topics Prism doesn't
 * have yet, the course outcomes and credits. The file itself and its full text stay on the device.
 */

const name = z.string().trim().min(1).max(160);

export const StoredMatchSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("prism"),
    /** The Prism subject this syllabus subject is (or is a part of). */
    subjectId: z.string().min(1).max(80),
    /** Prism topics the syllabus covers, as "ownerSubject/topicId" (a linked chapter belongs to its own subject). */
    covered: z.array(z.string().max(160)).max(400),
    /** Topics the syllabus lists that Prism does not have yet. */
    extra: z.array(z.string().trim().max(120)).max(60),
    /** "auto" = the names clearly matched; "confirmed" = the student said so. */
    by: z.enum(["auto", "confirmed"]),
  }),
  z.object({
    kind: z.literal("own"),
    /** The student's own subject made from this syllabus subject. */
    customId: z.string().max(80).optional(),
  }),
]);
export type StoredMatch = z.infer<typeof StoredMatchSchema>;

export const StoredSubjectSchema = z.object({
  name,
  code: z.string().trim().max(24).optional(),
  credits: z.number().min(0.5).max(30).optional(),
  /** The course outcomes (COs) as written, used to set depth and emphasis in this student's lessons. */
  outcomes: z.array(z.string().trim().max(400)).max(12),
  /** How many units and topics the syllabus lists (for the card). */
  unitCount: z.int().min(0).max(40),
  topicCount: z.int().min(0).max(600),
  /** What could not be read ("name", "units"). */
  unclear: z.array(z.string().max(40)).max(6),
  match: StoredMatchSchema,
});
export type StoredSubject = z.infer<typeof StoredSubjectSchema>;

export const StoredSemesterSchema = z.object({
  semester: z.int().min(1).max(8),
  uploadedAt: z.number(),
  fileName: z.string().max(160).optional(),
  subjects: z.array(StoredSubjectSchema).max(40),
  /** Laboratory and practical courses found (listed, not turned into subjects). */
  labs: z.array(z.string().max(160)).max(20),
});
export type StoredSemester = z.infer<typeof StoredSemesterSchema>;

/** Semester number ("1"…"8") → its syllabus. */
export type SyllabusByTerm = Record<string, StoredSemester>;

export const SyllabusByTermSchema = z.record(z.string().regex(/^[1-8]$/), StoredSemesterSchema);
