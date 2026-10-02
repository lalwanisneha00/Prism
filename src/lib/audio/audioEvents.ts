import type { ChapterPlan } from "@/lib/audio/generateNarration";
import type { AudioChapter } from "@/lib/audio/timeline";
import type { LlmErrorKind } from "@/lib/llm/types";

/*
 * /api/audio is called once for the outline, then once per chapter, so no single request
 * runs long enough to hit the free hosting time limit, even for a 90-minute narration.
 */
export type AudioRequest =
  | { step: "outline"; lesson: unknown }
  | {
      step: "chapter";
      lesson: unknown;
      plan: ChapterPlan[];
      index: number;
      previousEnding: string;
    };

export type AudioResponse =
  | { ok: true; plan: ChapterPlan[] }
  | { ok: true; chapter: AudioChapter }
  | { ok: false; kind: LlmErrorKind | "invalid-request"; message: string };
