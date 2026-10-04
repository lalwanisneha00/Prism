"use client";

import type { ReactNode } from "react";
import { WidgetButton } from "@/visuals/ui";

/** Back / Next / end controls for step-through widgets. */
export function StepNav({
  index,
  count,
  onChange,
}: {
  index: number;
  count: number;
  onChange: (i: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
      <WidgetButton onClick={() => onChange(Math.max(0, index - 1))}>◀ Back</WidgetButton>
      <WidgetButton onClick={() => onChange(Math.min(count - 1, index + 1))}>Next ▶</WidgetButton>
      <WidgetButton onClick={() => onChange(count - 1)}>Jump to end</WidgetButton>
      <WidgetButton onClick={() => onChange(0)}>Restart</WidgetButton>
      <span className="text-sm text-muted">
        Step {index + 1} of {count}
      </span>
    </div>
  );
}

/** A row of labelled boxes (an array, a stack, a queue, a tape…). */
export function Cells({
  items,
  highlight = [],
  muted = [],
  label,
  vertical = false,
}: {
  items: (string | number | null)[];
  highlight?: number[];
  muted?: number[];
  label?: string;
  vertical?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs text-muted">{label}</span>}
      <div
        className={`flex ${vertical ? "flex-col-reverse" : "flex-wrap"} gap-1 font-mono text-sm`}
        role="list"
        aria-label={label}
      >
        {items.length === 0 && <span className="text-xs text-muted">(empty)</span>}
        {items.map((v, i) => (
          <span
            key={i}
            role="listitem"
            className={`grid h-9 min-w-9 place-items-center rounded-md border px-2 ${
              highlight.includes(i)
                ? "border-[#e1306c] bg-[#e1306c]/15 font-bold"
                : muted.includes(i)
                  ? "border-border opacity-40"
                  : "border-border bg-surface"
            }`}
          >
            {v === null ? "·" : v}
          </span>
        ))}
      </div>
    </div>
  );
}

/** A compact table for step traces. */
export function TraceTable({
  head,
  rows,
  highlightRow,
}: {
  head: string[];
  rows: ReactNode[][];
  highlightRow?: number;
}) {
  return (
    <div className="max-h-72 overflow-auto">
      <table className="w-full text-center font-mono text-xs sm:text-sm">
        <thead className="sticky top-0 bg-surface-2">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-2 py-1 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className={i === highlightRow ? "bg-primary-soft font-bold text-primary" : ""}
            >
              {r.map((c, j) => (
                <td key={j} className="border-t border-border px-2 py-1">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A labelled text input that only commits on change (for strings the student types). */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm sm:col-span-2">
      <span>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="rounded-lg border border-border bg-surface px-3 py-2 font-mono"
      />
    </label>
  );
}

/** Choice buttons that show which one is active. */
export function Choice<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 sm:col-span-2" role="radiogroup">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={o === value}
          onClick={() => onChange(o)}
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
            o === value
              ? "border-primary bg-primary-soft text-primary"
              : "border-border bg-surface hover:bg-surface-2"
          }`}
        >
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}
