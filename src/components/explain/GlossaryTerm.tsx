"use client";

import { Icon } from "@/components/Icon";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * A glossary term in the lesson text: dotted underline; hover, focus or tap shows a small
 * definition card. Like a dictionary in the margin of a textbook.
 */
export function GlossaryTerm({
  term,
  definition,
  children,
}: {
  term: string;
  definition: string;
  children: ReactNode;
}) {
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const [pinned, setPinned] = useState(false);

  function show() {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(288, window.innerWidth - 24);
    const left = Math.min(
      Math.max(12, r.left + r.width / 2 - width / 2),
      window.innerWidth - width - 12,
    );
    const above = r.bottom + 140 > window.innerHeight;
    setPos({ left, top: above ? r.top - 8 : r.bottom + 8, above });
  }
  function hide() {
    setPos(null);
    setPinned(false);
  }

  // A pinned (tapped) card closes on scroll, Escape or a tap elsewhere.
  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent && e.key !== "Escape") return;
      if (e.type === "pointerdown" && ref.current?.contains(e.target as Node)) return;
      hide();
    };
    window.addEventListener("scroll", close, { passive: true });
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", close);
    return () => {
      window.removeEventListener("scroll", close);
      window.removeEventListener("keydown", close);
      window.removeEventListener("pointerdown", close);
    };
  }, [pos]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-describedby={pos ? id : undefined}
        aria-expanded={pos !== null}
        onMouseEnter={show}
        onMouseLeave={() => !pinned && hide()}
        onFocus={show}
        onBlur={() => !pinned && hide()}
        onClick={() => {
          if (pinned) hide();
          else {
            show();
            setPinned(true);
          }
        }}
        className="cursor-help underline decoration-primary decoration-dotted decoration-2 underline-offset-4 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-primary"
      >
        {children}
      </button>
      {pos && (
        <span
          id={id}
          role="tooltip"
          style={{
            left: pos.left,
            top: pos.top,
            width: "min(18rem, calc(100vw - 24px))",
            transform: pos.above ? "translateY(-100%)" : undefined,
          }}
          className="fixed z-50 block rounded-xl border border-border bg-surface p-3 text-left text-sm shadow-lg"
        >
          <span className="block font-semibold text-primary">
            <Icon name="book" /> {term}
          </span>
          <span className="mt-1 block text-fg">{definition}</span>
        </span>
      )}
    </>
  );
}
