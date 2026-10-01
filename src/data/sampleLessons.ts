import gaussLawFirstEncounter from "@/data/sample-lessons/gauss-law.first-encounter.json";
import { LessonSchema, type Lesson } from "@/lib/schema";

/**
 * Hand-written lessons used to build and test the renderer (Step 5) before AI
 * generation exists. Parsed at load time so a broken sample fails immediately.
 */
export const sampleLessons: readonly Lesson[] = [LessonSchema.parse(gaussLawFirstEncounter)];

export function findSampleLesson(topic: string, level: string): Lesson | undefined {
  return sampleLessons.find((l) => l.meta.topic === topic && l.meta.level === level);
}
