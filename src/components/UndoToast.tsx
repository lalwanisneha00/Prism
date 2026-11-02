"use client";

import { useEffect } from "react";

export const UNDO_MS = 5000;

/** A message at the bottom of the screen with an Undo button; goes away on its own after 5 s. */
export function UndoToast({
  message,
  onUndo,
  onDone,
}: {
  message: string;
  onUndo: () => void;
  /** Called when the toast goes away without Undo. */
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, UNDO_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-fg px-4 py-2 text-sm text-bg shadow-xl sm:bottom-4"
      data-testid="undo-toast"
    >
      <p className="min-w-0 flex-1">{message}</p>
      <button
        type="button"
        onClick={onUndo}
        className="min-h-11 shrink-0 rounded-xl px-3 font-semibold underline underline-offset-2"
      >
        Undo
      </button>
    </div>
  );
}
