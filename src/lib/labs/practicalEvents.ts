import type { LessonEvent } from "@/lib/lessonEvents";
import type { LabLessonAny } from "@/lib/labs/labLesson";

/** Messages /api/practical streams to the page, one JSON object per line (like /api/lesson). */
export type PracticalEvent =
  | { type: "stage"; stage: "sources" | "writing" | "fixing"; message: string }
  /** The stored copy predates a syllabus change to this experiment: a new one is being written. */
  | { type: "updating" }
  | {
      type: "lesson";
      /** Phase 7C format, or a Phase 7B lesson still in the library. */
      lesson: LabLessonAny;
      cached: boolean;
      underReview?: boolean;
      rebuiltFromFlags?: boolean;
    }
  | Extract<LessonEvent, { type: "error" }>;
