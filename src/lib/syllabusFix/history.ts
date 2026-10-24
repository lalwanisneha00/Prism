import { z } from "zod";

/*
 * syllabus_history (syllabus fix, Phase 1): the undo button. Every change to the syllabus is one
 * entry: what changed, the old and new value, who or what caused it, when, and whether it was
 * undone. Admin and script changes are lines in data/university/pdeu/history.jsonl (in git); live
 * student-driven changes (Phase 5) use the same shape in Firestore `syllabusHistory`.
 * Entries are never edited except to set `reverted`.
 */

export const HISTORY_ACTORS = ["script", "admin", "student", "system"] as const;

export const HistoryTargetSchema = z.object({
  kind: z.enum(["catalogue", "branch", "subject", "chapter", "topic"]),
  subject: z.string().min(1).optional(),
  chapter: z.string().min(1).optional(),
  topic: z.string().min(1).optional(),
});

export const HistoryEntrySchema = z.object({
  id: z.string().min(1),
  at: z.string().min(1),
  actor: z.object({ kind: z.enum(HISTORY_ACTORS), id: z.string().min(1).optional() }),
  /** Why: a script/migration name, a proposal id, "admin edit", ... */
  cause: z.string().min(1),
  target: HistoryTargetSchema,
  /** The field that changed ("chapters", "status", "parent", ...). */
  field: z.string().min(1),
  oldValue: z.unknown(),
  newValue: z.unknown(),
  reverted: z.boolean(),
  /** The id of the entry that undid this one. */
  revertedBy: z.string().min(1).optional(),
});

export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

/** A new, not-yet-reverted entry. `at` defaults to now; `id` is time + a short random part. */
export function historyEntry(
  fields: Omit<HistoryEntry, "id" | "at" | "reverted" | "revertedBy"> & { at?: string },
): HistoryEntry {
  const at = fields.at ?? new Date().toISOString();
  return {
    ...fields,
    id: `${at.replace(/[^0-9]/g, "").slice(0, 14)}-${Math.random().toString(36).slice(2, 8)}`,
    at,
    reverted: false,
  };
}

/** Reads a .jsonl history; a bad line is reported, never silently skipped. */
export function parseHistory(text: string): { entries: HistoryEntry[]; problems: string[] } {
  const entries: HistoryEntry[] = [];
  const problems: string[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      problems.push(`line ${i + 1}: not JSON`);
      return;
    }
    const parsed = HistoryEntrySchema.safeParse(json);
    if (parsed.success) entries.push(parsed.data);
    else problems.push(`line ${i + 1}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
  });
  return { entries, problems };
}

export function formatHistory(entries: readonly HistoryEntry[]): string {
  return entries.map((e) => JSON.stringify(e)).join("\n") + (entries.length ? "\n" : "");
}

/** Marks one entry as undone (by the entry that undid it). Unknown or already-reverted: unchanged. */
export function markReverted(
  entries: readonly HistoryEntry[],
  id: string,
  revertedBy?: string,
): HistoryEntry[] {
  return entries.map((e) =>
    e.id === id && !e.reverted
      ? { ...e, reverted: true, ...(revertedBy ? { revertedBy } : {}) }
      : e,
  );
}
