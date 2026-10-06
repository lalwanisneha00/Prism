"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useMySemester } from "@/components/subjects/useMySemester";

type Option = { id: string; name: string };

/**
 * One collapsed "Choose subject" control (instead of a row of tags): opens a list with a
 * "Search subject" box, "All subjects" first, then the student's own semester subjects, then the rest.
 */
export function SubjectFilter({
  subjects,
  value,
  onChange,
}: {
  subjects: readonly Option[];
  value: string;
  onChange: (id: string) => void;
}) {
  const id = useId();
  const { picks } = useMySemester();
  const [query, setQuery] = useState("");
  const details = useRef<HTMLDetailsElement>(null);
  const current = subjects.find((s) => s.id === value);

  const { mine, rest, showAll } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ok = (s: Option) => !q || s.name.toLowerCase().includes(q);
    const mineList = picks
      .map((p) => subjects.find((s) => s.id === p))
      .filter((s): s is Option => Boolean(s) && ok(s!));
    const taken = new Set(mineList.map((s) => s.id));
    return {
      mine: mineList,
      rest: subjects.filter((s) => !taken.has(s.id) && ok(s)),
      showAll: !q || "all subjects".includes(q),
    };
  }, [picks, query, subjects]);

  const choose = (next: string) => {
    onChange(next);
    setQuery("");
    if (details.current) details.current.open = false;
  };
  const item = (s: Option) => (
    <li key={s.id}>
      <button
        type="button"
        aria-pressed={value === s.id}
        onClick={() => choose(s.id)}
        className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2 ${value === s.id ? "font-semibold text-primary" : ""}`}
      >
        {s.name}
      </button>
    </li>
  );

  return (
    <details
      ref={details}
      className="w-full max-w-md rounded-xl border border-border bg-surface"
      data-testid="materials-subject-filter"
    >
      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-semibold">
        Choose subject
        <span className="ml-2 font-normal text-muted">· {current?.name ?? "All subjects"}</span>
      </summary>
      <div className="flex flex-col gap-2 border-t border-border p-3">
        <label htmlFor={`${id}-q`}>
          <span className="sr-only">Search subject</span>
          <input
            id={`${id}-q`}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subject"
            className="w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"
          />
        </label>
        <div className="max-h-72 overflow-y-auto">
          <ul>{showAll && item({ id: "", name: "All subjects" })}</ul>
          {mine.length > 0 && (
            <>
              <p className="px-3 pt-2 text-xs font-semibold tracking-wide text-muted uppercase">
                My subjects
              </p>
              <ul>{mine.map(item)}</ul>
              <p className="px-3 pt-2 text-xs font-semibold tracking-wide text-muted uppercase">
                All subjects
              </p>
            </>
          )}
          <ul>{rest.map(item)}</ul>
          {!showAll && mine.length + rest.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted">No subject matches “{query}”.</p>
          )}
        </div>
      </div>
    </details>
  );
}
