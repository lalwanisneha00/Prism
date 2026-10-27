"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import type { Contribution } from "@/lib/syllabusFix/credits";

/*
 * The live syllabus fixes the signed-in student helped with (syllabus fix, Phase 7). Asked once
 * per visit and kept in the tab, so the thank-you and the account page share one request.
 */

const KEY = "prism.myFixes";
let pending: { uid: string; promise: Promise<Contribution[] | null> } | null = null;

function fromSession(uid: string): Contribution[] | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as {
      uid?: unknown;
      fixes?: unknown;
    } | null;
    return saved?.uid === uid && Array.isArray(saved.fixes)
      ? (saved.fixes as Contribution[])
      : null;
  } catch {
    return null;
  }
}

async function fetchFixes(uid: string, token: string): Promise<Contribution[] | null> {
  const res = await fetch("/api/syllabus/contributions", {
    headers: { authorization: `Bearer ${token}` },
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; fixes?: unknown } | null;
  if (!data?.ok || !Array.isArray(data.fixes)) return null;
  const fixes = data.fixes.filter(
    (f): f is Contribution =>
      typeof f === "object" &&
      f !== null &&
      typeof (f as Contribution).proposalId === "string" &&
      typeof (f as Contribution).text === "string" &&
      typeof (f as Contribution).students === "number",
  );
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ uid, fixes }));
  } catch {
    // Storage blocked: asked again on the next page.
  }
  return fixes;
}

/** null while loading, signed out or unavailable; otherwise the fixes, newest first. */
export function useMyFixes(): Contribution[] | null {
  const { user } = useAuth();
  const [state, setState] = useState<{ uid: string; fixes: Contribution[] | null } | null>(null);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const saved = fromSession(user.uid);
    if (!saved && pending?.uid !== user.uid)
      pending = {
        uid: user.uid,
        promise: user
          .getIdToken()
          .then((token) => fetchFixes(user.uid, token))
          .catch(() => null),
      };
    const promise = saved ? Promise.resolve(saved) : pending!.promise;
    void promise.then((fixes) => {
      if (alive) setState({ uid: user.uid, fixes });
    });
    return () => {
      alive = false;
    };
  }, [user]);
  return user && state?.uid === user.uid ? state.fixes : null;
}
