"use client";

import { useEffect } from "react";

/** "/" jumps to the topic search from anywhere on the home page (like many websites). */
export function KeyboardShortcuts() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // The target can be the window or document (no .closest), not only an element.
      const target = e.target instanceof Element ? e.target : null;
      const typing = target?.closest("input, textarea, select, [contenteditable=true]");
      if (e.key !== "/" || typing || e.ctrlKey || e.metaKey || e.altKey) return;
      const search = document.querySelector<HTMLInputElement>('input[type="search"]');
      if (search) {
        e.preventDefault();
        search.focus();
        search.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
