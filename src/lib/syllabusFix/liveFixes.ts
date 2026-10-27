import { SYLLABUS_FIX_CONFIG } from "@/lib/syllabusFix/config";
import { EMPTY_OVERLAY, staleFromOverlay, type Overlay } from "@/lib/syllabusFix/overlay";
import type { Proposal } from "@/lib/syllabusFix/proposals";
import { worthSettling, type ProposalStore } from "@/lib/syllabusFix/proposalStore";
import { staleTopics, type StaleTopics } from "@/lib/syllabusFix/stale";

/*
 * Server helpers for the live fixes (syllabus fix, Phase 5): settle the proposals a submission
 * touched, and keep one copy of the overlay in memory for a few minutes, so a busy server reads
 * Firestore about once per five minutes instead of on every lesson.
 */

/** Settles the touched proposals that may now pass. Returns how many went live. */
export async function settleTouched(
  store: ProposalStore,
  touched: readonly Pick<Proposal, "id" | "points" | "status">[],
  at: string,
): Promise<number> {
  const due = worthSettling(touched, SYLLABUS_FIX_CONFIG.autoApply.minPoints);
  let applied = 0;
  for (const p of due) {
    const result = await store.settle(p.id, at).catch((err: unknown) => {
      console.warn("[syllabus] settle failed:", String(err).slice(0, 200));
      return null;
    });
    if (result?.verdict.action === "apply") applied++;
  }
  if (applied > 0) forgetOverlay();
  return applied;
}

let cached: { overlay: Overlay; at: number } | null = null;

/** The live fixes, from memory when read in the last few minutes. Empty when Firestore fails. */
export async function liveOverlay(store: ProposalStore | null): Promise<Overlay> {
  const now = Date.now();
  if (cached && now - cached.at < SYLLABUS_FIX_CONFIG.overlayCacheSeconds * 1000)
    return cached.overlay;
  if (!store) return EMPTY_OVERLAY;
  const overlay = await store.overlay().catch((err: unknown) => {
    console.warn("[syllabus] overlay read failed:", String(err).slice(0, 200));
    return cached?.overlay ?? EMPTY_OVERLAY;
  });
  cached = { overlay, at: now };
  return overlay;
}

/** After a change goes live on this server, read it again next time. */
export function forgetOverlay(): void {
  cached = null;
}

/** The stale-topics map with the live fixes added (moved or split topics). */
export async function liveStaleTopics(store: ProposalStore | null): Promise<StaleTopics> {
  const overlay = await liveOverlay(store);
  return overlay.changes.length ? staleFromOverlay(overlay, staleTopics) : staleTopics;
}
