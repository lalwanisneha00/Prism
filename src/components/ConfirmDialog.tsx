"use client";

import { useEffect, useRef } from "react";

/**
 * "Are you sure?" with Cancel and a red confirm button. Built on the browser's own <dialog>, so
 * focus stays inside it, Escape cancels and the page behind can't be clicked.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault(); // Escape: close through React state
        onCancel();
      }}
      onClick={(e) => e.target === ref.current && onCancel()} // click on the backdrop
      aria-labelledby="confirm-title"
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-border bg-surface p-5 text-fg shadow-xl backdrop:bg-black/40"
    >
      <h2 id="confirm-title" className="text-lg font-bold">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted">{body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-border px-4 font-semibold hover:bg-surface-2"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="min-h-11 rounded-xl bg-danger px-4 font-semibold text-bg hover:opacity-90"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
