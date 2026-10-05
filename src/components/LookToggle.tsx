"use client";

import { useState } from "react";
import { LOOK_STORAGE_KEY } from "@/lib/theme";

/** "Classic look" ⇄ "New look": the earlier purple interface stays available. */
export function LookToggle() {
  const [look, setLook] = useState<"new" | "classic">(() =>
    typeof document !== "undefined" && document.documentElement.dataset.look === "classic"
      ? "classic"
      : "new",
  );
  return (
    <button
      type="button"
      onClick={() => {
        const next = look === "new" ? "classic" : "new";
        document.documentElement.setAttribute("data-look", next);
        try {
          localStorage.setItem(LOOK_STORAGE_KEY, next);
        } catch {
          // Not saved, but the switch still works for this visit.
        }
        setLook(next);
      }}
      className="underline underline-offset-2"
      suppressHydrationWarning
    >
      {look === "new" ? "Classic look" : "New look"}
    </button>
  );
}
