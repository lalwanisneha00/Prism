import { z } from "zod";
import staleData from "@/data/syllabus/stale-topics.json";

/*
 * Stale lessons (syllabus fix, Phase 1). When a topic moves or changes, its cached lessons must not
 * be regenerated in bulk. Instead the topic goes into a small map, "subject/topic" → when it changed.
 * A cached lesson made before that time counts as stale and is rebuilt only when a student next
 * opens it. This works like a `stale` flag on every cached lesson, without writing to any of them.
 */

export const StaleTopicsSchema = z.object({
  version: z.literal(1),
  /** "subject/topic" → ISO time of the change. */
  topics: z.record(z.string().min(3), z.iso.datetime()),
});

export type StaleTopics = z.infer<typeof StaleTopicsSchema>;

export const staleTopics: StaleTopics = StaleTopicsSchema.parse(staleData);

/**
 * True when a lesson cached at `createdAt` predates a change to its topic. A lesson with no known
 * creation time counts as stale once its topic has changed (safer to rebuild than to show old content).
 */
export function isLessonStale(
  map: StaleTopics,
  subject: string,
  topic: string,
  createdAt: string | undefined,
): boolean {
  const changedAt = map.topics[`${subject}/${topic}`];
  if (!changedAt) return false;
  if (!createdAt) return true;
  const made = Date.parse(createdAt);
  return Number.isNaN(made) || made < Date.parse(changedAt);
}

/** The map with topics marked as changed now (or at `at`); used by the import and admin scripts. */
export function markStale(
  map: StaleTopics,
  keys: readonly { subject: string; topic: string }[],
  at: string = new Date().toISOString(),
): StaleTopics {
  const topics = { ...map.topics };
  for (const k of keys) topics[`${k.subject}/${k.topic}`] = at;
  return { version: 1, topics };
}
