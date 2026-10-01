import type { AudioChapter } from "@/lib/audio/timeline";
import type { LlmErrorKind } from "@/lib/llm/types";

/** Messages the /api/audio stream sends, one JSON object per line. */
export type AudioEvent =
  | { type: "chapter"; index: number; total: number; chapter: AudioChapter }
  | { type: "done" }
  | { type: "error"; kind: LlmErrorKind | "invalid-request"; message: string };
