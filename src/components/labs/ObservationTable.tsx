"use client";

import { useState } from "react";
import type { PracticalLesson } from "@/lib/labs/practicalSchema";

type Table = PracticalLesson["observations"];

/** The blank table as tab-separated text (pastes into a spreadsheet or a document as a table). */
export function blankTableText(t: Table): string {
  const head = ["S. No.", ...t.columns].join("\t");
  const rows = Array.from({ length: t.blankRows }, (_, i) =>
    [String(i + 1), ...t.columns.map(() => "")].join("\t"),
  );
  return [head, ...rows].join("\n");
}

function Grid({
  columns,
  rows,
  caption,
}: {
  columns: string[];
  rows: string[][];
  caption: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-max border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface-2">
          <tr>
            <th scope="col" className="border-b border-border px-3 py-2 text-left">
              S. No.
            </th>
            {columns.map((c) => (
              <th key={c} scope="col" className="border-b border-border px-3 py-2 text-left">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-surface even:bg-surface-2/40">
              <td className="border-b border-border px-3 py-1.5 text-muted">{i + 1}</td>
              {r.map((cell, k) => (
                <td key={k} className="h-8 border-b border-border px-3 py-1.5 font-mono">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A blank observation table to copy, and a filled sample with realistic values. */
export function ObservationTable({ table }: { table: Table }) {
  const [copied, setCopied] = useState<"yes" | "no" | null>(null);
  const blank = Array.from({ length: table.blankRows }, () => table.columns.map(() => ""));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-semibold">Blank table for your record</h4>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard
                ?.writeText(blankTableText(table))
                .then(() => setCopied("yes"))
                .catch(() => setCopied("no"));
            }}
            className="rounded-full border border-border px-3 py-1 text-sm font-semibold hover:bg-surface-2"
          >
            Copy blank table
          </button>
        </div>
        {copied && (
          <p className="text-sm text-muted" aria-live="polite">
            {copied === "yes"
              ? "Copied. Paste it into a spreadsheet or a document."
              : "Could not copy here. Select the table and copy it instead."}
          </p>
        )}
        <Grid columns={table.columns} rows={blank} caption="Blank observation table" />
      </div>
      <div className="flex flex-col gap-2">
        <h4 className="font-semibold">Sample readings</h4>
        <Grid columns={table.columns} rows={table.sampleRows} caption="Sample observations" />
        <p className="text-xs text-muted">
          Sample values show what a typical set of readings looks like. Record your own in the lab.
        </p>
      </div>
    </div>
  );
}
