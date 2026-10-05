"use client";

import Link from "next/link";

/** "Your university syllabus is applied": what is hidden, and the way back to everything. */
export function ScopeNotice({
  hidden,
  name,
  onShowAll,
}: {
  hidden: number;
  name: string;
  onShowAll: () => void;
}) {
  return (
    <p
      role="note"
      data-testid="scope-notice"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm"
    >
      <span>
        Showing what {name || "your university"} teaches
        {hidden > 0 ? ` (${hidden} topic${hidden === 1 ? "" : "s"} hidden)` : ""}.
      </span>
      <button type="button" onClick={onShowAll} className="font-semibold text-primary underline">
        Show everything
      </button>
      <Link href="/subjects/university" className="font-semibold text-primary underline">
        Edit my syllabus
      </Link>
    </p>
  );
}
