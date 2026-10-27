"use client";

import { useEffect, useState } from "react";
import { SYLLABUS_FIX_CONFIG } from "@/lib/syllabusFix/config";
import { EMPTY_OVERLAY, OverlaySchema, type Overlay } from "@/lib/syllabusFix/overlay";

/*
 * The live syllabus fixes in the browser (syllabus fix, Phase 5): fetched once per visit, kept in
 * the tab for a few minutes, and checked with Zod before use. When it can't be fetched (offline,
 * no Firebase) the built-in syllabus is shown as it is.
 */

const KEY = "prism.syllabusOverlay";
let pending: Promise<Overlay> | null = null;

function fromSession(): Overlay | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { at?: unknown; overlay?: unknown };
    if (typeof saved.at !== "number") return null;
    if (Date.now() - saved.at > SYLLABUS_FIX_CONFIG.overlayCacheSeconds * 1000) return null;
    return OverlaySchema.safeParse(saved.overlay).data ?? null;
  } catch {
    return null;
  }
}

/** The live fixes (one request per visit, shared by every hook on the page). */
export function loadSyllabusOverlay(): Promise<Overlay> {
  const saved = fromSession();
  if (saved) return Promise.resolve(saved);
  pending ??= fetch("/api/syllabus/overlay")
    .then((res) => (res.ok ? res.json() : null))
    .then((data: unknown) => {
      const overlay = OverlaySchema.safeParse(data).data ?? EMPTY_OVERLAY;
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ at: Date.now(), overlay }));
      } catch {
        // Storage blocked (private window): fetched again next visit.
      }
      return overlay;
    })
    .catch(() => EMPTY_OVERLAY)
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function useSyllabusOverlay(): Overlay {
  const [overlay, setOverlay] = useState<Overlay>(EMPTY_OVERLAY);
  useEffect(() => {
    let alive = true;
    void loadSyllabusOverlay().then((o) => {
      if (alive && o.changes.length > 0) setOverlay(o);
    });
    return () => {
      alive = false;
    };
  }, []);
  return overlay;
}
