import type { LessonEvent } from "@/lib/lessonEvents";
import type { PracticalLesson } from "@/lib/labs/practicalSchema";

/** Messages /api/practical streams to the page, one JSON object per line (like /api/lesson). */
export type PracticalEvent =
  | { type: "stage"; stage: "sources" | "writing" | "fixing"; message: string }
  /** The stored copy predates a syllabus change to this experiment: a new one is being written. */
  | { type: "updating" }
  | {
      type: "lesson";
      lesson: PracticalLesson;
      cached: boolean;
      underReview?: boolean;
      rebuiltFromFlags?: boolean;
    }
  | Extract<LessonEvent, { type: "error" }>;
