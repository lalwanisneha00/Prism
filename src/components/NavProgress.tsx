"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Instant feedback for every internal link: a thin bar appears the moment a link is pressed (well
 * under 100 ms), and goes when the next page has arrived. Pure feedback: it never changes where a
 * link goes or what a page does.
 */
export function NavProgress() {
  const pathname = usePathname();
  // The page the student was on when they pressed a link; the bar shows until the path changes.
  const [from, setFrom] = useState<string | null>(null);
  const [seen, setSeen] = useState(pathname);
  // The new page arrived: forget the press (adjusting state while rendering, as React advises).
  if (seen !== pathname) {
    setSeen(pathname);
    setFrom(null);
  }
  const pending = from !== null && from === pathname;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      const href = a?.getAttribute("href");
      if (
        !a ||
        !href ||
        !href.startsWith("/") ||
        a.target === "_blank" ||
        a.hasAttribute("download")
      )
        return;
      const to = new URL(href, location.href);
      if (to.pathname + to.search === location.pathname + location.search) return;
      setFrom(location.pathname);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => setFrom(null), 15_000);
    return () => clearTimeout(t);
  }, [pending]);

  if (!pending) return null;
  return (
    <div
      role="progressbar"
      aria-label="Loading the next page"
      className="fixed inset-x-0 top-0 z-[60] h-1 overflow-hidden bg-primary-soft"
    >
      <div className="nav-progress-bar h-full w-1/3 bg-primary" />
    </div>
  );
}
