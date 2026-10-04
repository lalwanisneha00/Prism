import type { LearningSignalRecord } from "@/lib/storage/db";
import { getAllRecords, putRecord } from "@/lib/storage/records";

/* Recording the small learning signals behind the weak-topic score (V3 · Step 11). Synced. */

/** A numeric answer ("12.5 V", "3×10^8 m/s", "−4") makes a numerical question. */
export function questionTypeOf(answer: string): "numerical" | "conceptual" {
  const t = answer.trim();
  return /^[−-]?\s*\$?\s*[\d.]/.test(t) || /^\$[^$]*\d[^$]*\$\s*[a-zΩμ°/%·^\s\d]*$/i.test(t)
    ? "numerical"
    : "conceptual";
}

export async function recordSignal(
  input: Omit<LearningSignalRecord, "id" | "updatedAt" | "deleted" | "at">,
  now = Date.now(),
): Promise<void> {
  await putRecord("learningSignals", {
    ...input,
    question: input.question?.slice(0, 200),
    id: `${input.kind}:${input.subject}/${input.topic}@${now}:${Math.random().toString(36).slice(2, 6)}`,
    at: now,
    updatedAt: now,
    deleted: false,
  });
}

export async function listSignals(): Promise<LearningSignalRecord[]> {
  return (await getAllRecords("learningSignals")).filter((s) => !s.deleted);
}
