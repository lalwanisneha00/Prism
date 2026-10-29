/*
 * Phase 7B lab lessons (one format for every lab): the version their library copies carry, so
 * they can still be read until they are marked stale (see LAB_CONFIG.keepPhase7BLessons). The
 * lesson request and the repair prompt are shared with Phase 7C (src/lib/labs/labPrompt.ts).
 */
export const PRACTICAL_PROMPT_VERSION = "practical-2026-10-28.1";

export type PracticalRequest = {
  subject: { id: string; name: string; code?: string; field: string };
  experiment: { id: string; name: string; number?: number; aim?: string };
  /** Theory topics this experiment builds on (from the related theory course). */
  theoryTopics: string[];
};

export function buildPracticalRepairPrompt(prompt: string, reply: string, problems: string[]) {
  return `${prompt}

Your previous reply had these problems. Fix all of them and reply with the whole corrected JSON object only:
${problems
  .slice(0, 12)
  .map((p) => `- ${p}`)
  .join("\n")}

PREVIOUS REPLY (for reference):
${reply.slice(0, 12_000)}`;
}
