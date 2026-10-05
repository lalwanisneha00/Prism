"use client";

import type { ReactNode } from "react";

/** Okabe–Ito colours: told apart by people with every common kind of colour blindness. */
export const palette = ["var(--primary)", "#e69f00", "#009e73", "#d55e00", "#0072b2", "#cc79a7"];

/** Where a visual's numbers come from (SPEC §4.1): always said under the visual. */
export function DataNote({ data, sourceId }: { data?: string; sourceId?: string }) {
  if (data === "illustrative") {
    return (
      <p className="w-fit rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
        Illustrative example, not real data
      </p>
    );
  }
  if (data === "sourced" && sourceId) {
    return (
      <p className="text-xs text-muted">
        Data from{" "}
        <a href={`#source-${sourceId}`} className="font-semibold text-primary underline">
          the cited source
        </a>
      </p>
    );
  }
  if (data === "computed") {
    return <p className="text-xs text-muted">Computed in code, not hand-drawn.</p>;
  }
  return null;
}

/** The frame every generic visual sits in: title, picture, controls, caption, data note. */
export function GenericFrame({
  icon,
  title,
  caption,
  children,
  controls,
  note,
  interactive = false,
}: {
  icon: string;
  title: string;
  caption: string;
  children: ReactNode;
  controls?: ReactNode;
  note?: ReactNode;
  interactive?: boolean;
}) {
  return (
    <figure className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3 sm:p-4">
      <p className="text-sm font-semibold">
        {title}
        {interactive && <span className="font-normal text-muted"> · interactive</span>}
      </p>
      <div className="overflow-hidden rounded-lg border border-border bg-surface">{children}</div>
      {controls && <div className="grid gap-3 sm:grid-cols-2">{controls}</div>}
      <figcaption className="text-sm text-muted">{caption}</figcaption>
      {note}
    </figure>
  );
}
