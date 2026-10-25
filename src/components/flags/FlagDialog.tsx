"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/Icon";

/**
 * A small flag button that opens a dialog (syllabus fix, Phase 4). Icon-only on rows, with text on
 * course and lesson pages. The dialog's content mounts only while it is open, so every report
 * starts fresh.
 */
export function FlagDialog({
  label,
  text,
  title,
  children,
}: {
  /** What the button does, for screen readers and the tooltip. */
  label: string;
  /** Visible button text; without it the button is just the flag icon. */
  text?: string;
  title: string;
  children: (close: () => void) => ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        data-testid="flag-button"
        className={
          text
            ? "inline-flex w-fit items-center gap-1.5 self-start rounded-full border border-border px-3 py-1.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-fg"
            : "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
        }
      >
        <Icon name="flag" />
        {text}
      </button>
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // A tap on the dimmed backdrop closes it.
          if (e.target === e.currentTarget) close();
        }}
        aria-label={title}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-0 text-fg backdrop:bg-black/50"
      >
        {open && (
          <div className="flex flex-col gap-3 p-4 text-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="rounded-full px-2 text-lg leading-none text-muted hover:bg-surface-2"
              >
                ×
              </button>
            </div>
            {children(close)}
          </div>
        )}
      </dialog>
    </>
  );
}
