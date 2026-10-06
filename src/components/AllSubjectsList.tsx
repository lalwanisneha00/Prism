"use client";

import { useId, useMemo, useState } from "react";

type Option = { id: string; name: string; field: string };

/** A collapsed list of every subject with a search box (closed by default, never one long list). */
export function AllSubjectsList({
  subjects,
  currentId,
  firstIds = [],
  onSelect,
}: {
  subjects: readonly Option[];
  currentId: string;
  /** Subjects to list first (the student's own, their branch and semester). */
  firstIds?: readonly string[];
  onSelect: (id: string) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ok = (s: Option) =>
      !q || s.name.toLowerCase().includes(q) || s.field.toLowerCase().includes(q);
    const first = firstIds
      .map((fid) => subjects.find((s) => s.id === fid))
      .filter((s): s is Option => Boolean(s));
    const rest = subjects.filter((s) => !firstIds.includes(s.id));
    return [...first, ...rest].filter(ok);
  }, [subjects, query, firstIds]);

  return (
    <details
      className="rounded-xl border border-border bg-surface"
      data-testid="all-subjects-list"
      suppressHydrationWarning
    >
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold">
        All subjects on Prism <span className="font-normal text-muted">({subjects.length})</span>
      </summary>
      <div className="flex flex-col gap-2 border-t border-border p-3">
        <label htmlFor={`${id}-q`}>
          <span className="sr-only">Search subject</span>
          <input
            id={`${id}-q`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter must never submit the lesson form from here.
              if (e.key === "Enter") e.preventDefault();
            }}
            placeholder="Search subject"
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
          />
        </label>
        <ul className="grid max-h-72 gap-1 overflow-y-auto sm:grid-cols-2">
          {shown.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={s.id === currentId}
                onClick={() => onSelect(s.id)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2 ${s.id === currentId ? "font-semibold text-primary" : ""}`}
              >
                {s.name}
                <span className="block text-xs font-normal text-muted">{s.field}</span>
              </button>
            </li>
          ))}
        </ul>
        {shown.length === 0 && (
          <p className="px-1 text-sm text-muted">No subject matches “{query}”.</p>
        )}
      </div>
    </details>
  );
}
