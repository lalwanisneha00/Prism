import { z } from "zod";
import em from "@/data/subjects/em.json";
import enggMath from "@/data/subjects/engg-math.json";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "ids must be lowercase-kebab-case");

const TopicSchema = z.object({
  id: slug,
  name: z.string().min(1),
  /** Topics to know first (same subject): the edges of the concept map. */
  requires: z.array(slug).optional(),
});
const ChapterSchema = z.object({
  id: slug,
  name: z.string().min(1),
  topics: z.array(TopicSchema).min(1),
});
export const SubjectSchema = z.object({
  id: slug,
  name: z.string().min(1),
  field: z.string().min(1),
  /** Trust tier (SPEC §6.1): "verified" only once the subject's golden set passes ≥ 95%. */
  tier: z.enum(["verified", "sourced", "limited"]),
  chapters: z.array(ChapterSchema).min(1),
});

export type Topic = z.infer<typeof TopicSchema>;
export type Chapter = z.infer<typeof ChapterSchema>;
export type Subject = z.infer<typeof SubjectSchema>;

/**
 * Every subject the app teaches. Adding a subject = add a JSON file and list it here.
 * Parsing at load time means a typo in the data fails loudly, not silently.
 */
export const subjects: readonly Subject[] = [
  SubjectSchema.parse(em),
  SubjectSchema.parse(enggMath),
];

export function findSubject(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}

export function findChapter(subject: Subject, chapterId: string): Chapter | undefined {
  return subject.chapters.find((c) => c.id === chapterId);
}

export function findTopic(chapter: Chapter, topicId: string): Topic | undefined {
  return chapter.topics.find((t) => t.id === topicId);
}
