import type { LlmErrorKind } from "@/lib/llm/types";
import type { Lesson, Section } from "@/lib/schema";

/**
 * Messages the /api/lesson stream sends to the browser, one JSON object per line.
 * Shared by the server (which writes them) and the page (which reads them).
 */
export type LessonEvent =
  | { type: "stage"; stage: "sources" | "writing" | "fixing" | "checking"; message: string }
  | { type: "section"; section: Section }
  /** The stored copy predates a syllabus change to its topic: a new one is being written (Phase 7). */
  | { type: "updating" }
  | {
      type: "lesson";
      lesson: Lesson;
      cached: boolean;
      /** Set when the lesson is in the shared library, so saved copies can sync as a reference. */
      libraryKey?: string;
      /** Students reported problems again after a rebuild: an admin is checking it (Phase 5). */
      underReview?: boolean;
      /** Rebuilt just now from students' reports on the previous version (Phase 5). */
      rebuiltFromFlags?: boolean;
    }
  | {
      type: "error";
      kind: LlmErrorKind | "invalid-request";
      message: string;
      /** Set when the student's own key was used: the provider's name, so the page can offer the shared key. */
      usedUserKey?: string;
    };

/** What the student sees while an out-of-date lesson is rewritten (syllabus fix, Phase 7). */
export const UPDATING_MESSAGE = "Updating this lesson to match your syllabus…";

export type LessonErrorKind = Extract<LessonEvent, { type: "error" }>["kind"] | "offline";

/** Failures a student can get past with a key of their own (Settings → Your API keys). */
export const needsKey = (kind: LessonErrorKind) => kind === "not-configured" || kind === "auth";

/** What the student sees for each kind of failure. Technical details stay in server logs. */
export const errorCopy: Record<LessonErrorKind, { title: string; message: string }> = {
  "not-configured": {
    title: "Prism's shared AI isn't available",
    message:
      "Lessons can't be written with Prism's shared key right now. Add your own free AI key under Your API keys, then try again.",
  },
  auth: {
    title: "Prism's shared AI key stopped working",
    message: "Add your own free AI key under Your API keys, or try again later once it's fixed.",
  },
  "rate-limit": {
    title: "The free AI quota is busy",
    message: "Lots of students are learning right now. Wait a minute, then try again.",
  },
  unavailable: {
    title: "The AI service didn't answer",
    message: "It may be down for a moment. Try again in a few seconds.",
  },
  blocked: {
    title: "The AI stopped part-way",
    message: "Its safety filter cut the answer short. Try again; the next attempt usually works.",
  },
  "bad-response": {
    title: "That lesson didn't pass our checks",
    message:
      "The AI's answer had mistakes we couldn't fix automatically, so we didn't show it. Try again.",
  },
  "invalid-request": {
    title: "We couldn't open that lesson",
    message: "The topic or level in the link isn't valid.",
  },
  offline: {
    title: "You seem to be offline",
    message: "Check your internet connection, then try again.",
  },
};
