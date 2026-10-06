"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import { useMySemester } from "@/components/subjects/useMySemester";
import { subjectIndex } from "@/lib/catalogue";

/**
 * One collapsed "Choose subject" control (instead of a row of tags): opens a list of every subject
 * with a "Search subject" box at the top, the student's own semester subjects first.
 */
export function MapSubjectPicker({ currentId }: { currentId: string }) {
  const id = useId();
  const { picks } = useMySemester();
  const [query, setQuery] = useState("");
  const details = useRef<HTMLDetailsElement>(null);
  const current = subjectIndex.find((s) => s.id === currentId);

  const { mine, rest } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ok = (s: { name: string; field: string }) =>
      !q || s.name.toLowerCase().includes(q) || s.field.toLowerCase().includes(q);
    const mineList = picks
      .map((p) => subjectIndex.find((s) => s.id === p))
      .filter((s): s is NonNullable<typeof s> => Boolean(s) && ok(s!));
    const taken = new Set(mineList.map((s) => s.id));
    return { mine: mineList, rest: subjectIndex.filter((s) => !taken.has(s.id) && ok(s)) };
  }, [picks, query]);

  const item = (s: { id: string; name: string }) => (
    <li key={s.id}>
      <Link
        href={`/map?subject=${s.id}`}
        aria-current={s.id === currentId ? "page" : undefined}
        onClick={() => {
          if (details.current) details.current.open = false;
          setQuery("");
        }}
        className={`block rounded-lg px-3 py-2 text-sm hover:bg-surface-2 ${s.id === currentId ? "font-semibold text-primary" : ""}`}
      >
        {s.name}
      </Link>
    </li>
  );

  return (
    <details
      ref={details}
      className="relative w-full max-w-md rounded-xl border border-border bg-surface"
      data-testid="map-subject-picker"
    >
      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-semibold">
        Choose subject
        {current && <span className="ml-2 font-normal text-muted">· {current.name}</span>}
      </summary>
      <div className="flex flex-col gap-2 border-t border-border p-3">
        <label className="flex flex-col gap-1 text-sm" htmlFor={`${id}-q`}>
          <span className="sr-only">Search subject</span>
          <input
            id={`${id}-q`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject"
            className="rounded-xl border border-border bg-bg px-3 py-2"
          />
        </label>
        <div className="max-h-72 overflow-y-auto">
          {mine.length > 0 && (
            <>
              <p className="px-3 pt-1 text-xs font-semibold tracking-wide text-muted uppercase">
                My subjects
              </p>
              <ul>{mine.map(item)}</ul>
              <p className="px-3 pt-2 text-xs font-semibold tracking-wide text-muted uppercase">
                All subjects
              </p>
            </>
          )}
          <ul>{rest.map(item)}</ul>
          {mine.length + rest.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted">No subject matches “{query}”.</p>
          )}
        </div>
      </div>
    </details>
  );
}
