"use client";

import { useEffect, useState } from "react";
import { DB_BLOCKED_EVENT, DB_OPEN_EVENT } from "@/lib/storage/db";

/**
 * Shown when another, older Prism tab is keeping this device's saved data from being updated:
 * pages would otherwise wait on their loading skeletons with no explanation. Goes away by itself
 * the moment the other tab is closed or reloaded.
 */
export function DbBlockedNotice() {
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    const on = () => setBlocked(true);
    const off = () => setBlocked(false);
    window.addEventListener(DB_BLOCKED_EVENT, on);
    window.addEventListener(DB_OPEN_EVENT, off);
    return () => {
      window.removeEventListener(DB_BLOCKED_EVENT, on);
      window.removeEventListener(DB_OPEN_EVENT, off);
    };
  }, []);
  if (!blocked) return null;
  return (
    <p
      role="alert"
      data-testid="db-blocked"
      className="border-b border-warning/50 bg-warning/15 px-4 py-3 text-center text-sm font-semibold"
    >
      Prism was updated. Close your other Prism tabs (or reload them) so your saved data can open
      here. This message disappears by itself.
    </p>
  );
}
