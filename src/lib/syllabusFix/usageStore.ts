import type { Firestore } from "firebase-admin/firestore";
import {
  limitMessage,
  takeAllowance,
  UsageSchema,
  usageId,
  type Usage,
  type UsageKind,
} from "@/lib/syllabusFix/abuse";

/*
 * Daily send counts (syllabus fix, Phase 6): `syllabusUsage/{uid}__{day}`, written only by the
 * server. One small document per student per day they send something; each send is one read and
 * one write, well inside the free plan.
 */

export type Allowance = { ok: true } | { ok: false; limit: number };

export interface UsageStore {
  /** Counts one send of this kind, or says the student is over today's limit. */
  take(uid: string, kind: UsageKind, at: string): Promise<Allowance>;
}

export function adminUsageStore(db: Firestore): UsageStore {
  const col = db.collection("syllabusUsage");
  return {
    async take(uid, kind, at) {
      const ref = col.doc(usageId(uid, at));
      return db.runTransaction(async (tx) => {
        const before = UsageSchema.safeParse((await tx.get(ref)).data()).data;
        const result = takeAllowance(before, uid, kind, at);
        if (!result.ok) return result;
        tx.set(ref, result.usage);
        return { ok: true as const };
      });
    },
  };
}

export function memoryUsageStore(): UsageStore & { usage: Map<string, Usage> } {
  const usage = new Map<string, Usage>();
  return {
    usage,
    async take(uid, kind, at) {
      const result = takeAllowance(usage.get(usageId(uid, at)), uid, kind, at);
      if (!result.ok) return result;
      usage.set(usageId(uid, at), result.usage);
      return { ok: true };
    },
  };
}

/**
 * For routes: null when the send may go ahead, else the 429 reply. A failing count never blocks
 * a student (the limit is a guard, not a gate).
 */
export async function overDailyLimit(
  store: UsageStore,
  uid: string,
  kind: UsageKind,
): Promise<Response | null> {
  const result = await store.take(uid, kind, new Date().toISOString()).catch((err: unknown) => {
    console.warn("[syllabus] usage count failed:", String(err).slice(0, 200));
    return { ok: true as const };
  });
  if (result.ok) return null;
  return Response.json(
    { ok: false, kind: "rate-limited", message: limitMessage(kind) },
    { status: 429, headers: { "cache-control": "no-store" } },
  );
}
