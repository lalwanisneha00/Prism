"use client";

import type { HighlightColor } from "@/lib/storage/db";

/** The four highlight colours, used for swatches and the legend (same as ::highlight in CSS). */
export const swatchClass: Record<HighlightColor, string> = {
  important: "bg-[rgb(250_204_21_/_0.6)]",
  confused: "bg-[rgb(248_113_113_/_0.55)]",
  formula: "bg-[rgb(96_165_250_/_0.55)]",
  exam: "bg-[rgb(52_211_153_/_0.55)]",
};

export function ColorSwatch({
  color,
  label,
  selected = false,
  showLabel = false,
  onPick,
}: {
  color: HighlightColor;
  label: string;
  selected?: boolean;
  showLabel?: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Highlight: ${label}`}
      aria-pressed={selected}
      title={label}
      className={`flex items-center gap-1.5 rounded-full border px-1.5 py-1 text-xs font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary ${selected ? "border-fg" : "border-border"}`}
    >
      <span aria-hidden="true" className={`size-5 rounded-full ${swatchClass[color]}`} />
      {showLabel && <span className="pr-1">{label}</span>}
    </button>
  );
}

/** The colour key, shown with every set of highlights. */
export function HighlightLegend() {
  const items: [HighlightColor, string][] = [
    ["important", "Important"],
    ["confused", "Didn't understand"],
    ["formula", "Formula / definition"],
    ["exam", "Exam-likely"],
  ];
  return (
    <ul
      className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted"
      aria-label="Highlight colours"
    >
      {items.map(([c, label]) => (
        <li key={c} className="flex items-center gap-1">
          <span
            aria-hidden="true"
            className={`inline-block size-3 rounded-full ${swatchClass[c]}`}
          />
          {label}
        </li>
      ))}
      <li className="flex items-center gap-1">
        <span
          aria-hidden="true"
          className="inline-block w-4 border-b-2 border-dotted border-primary"
        />
        Comment
      </li>
    </ul>
  );
}
