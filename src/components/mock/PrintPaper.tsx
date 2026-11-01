"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Prints one sheet (the paper or the answer sheet) on its own, black on white whatever the theme:
 * it is drawn into #mock-print-root at the top of <body> and print styles hide everything else.
 * "Download PDF" uses the same print dialog with "Save as PDF", which keeps KaTeX maths exact and
 * costs nothing. `onDone` runs when the dialog closes.
 */
export function PrintPaper({
  children,
  title,
  onDone,
}: {
  children: ReactNode;
  /** Becomes the PDF's suggested file name. */
  title: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const before = document.title;
    document.title = title;
    document.body.classList.add("printing-mock");
    const finish = () => {
      document.body.classList.remove("printing-mock");
      document.title = before;
      onDone();
    };
    window.addEventListener("afterprint", finish, { once: true });
    // Give the browser a frame to lay out the sheet (and KaTeX its fonts) before printing.
    const t = setTimeout(() => window.print(), 150);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", finish);
      document.body.classList.remove("printing-mock");
      document.title = before;
    };
  }, [title, onDone]);
  return createPortal(
    <div id="mock-print-root" className="print-sheet">
      {children}
    </div>,
    document.body,
  );
}
