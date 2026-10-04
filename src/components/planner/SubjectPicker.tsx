"use client";

import { useId, useState } from "react";
import { subjects } from "@/lib/subjects";

/** Search and pick the subjects a plan covers (chips for the picked ones, a short result list). */
export function SubjectPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = q
    ? subjects
        .filter((s) => !selected.includes(s.id) && `${s.name} ${s.id}`.toLowerCase().includes(q))
        .slice(0, 8)
    : [];

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold" htmlFor={`${id}-q`}>
        Subjects in this plan
      </label>
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Chosen subjects">
          {selected.map((sid) => (
            <li key={sid}>
              <button
                type="button"
                onClick={() => onChange(selected.filter((x) => x !== sid))}
                aria-label={`Remove ${subjects.find((s) => s.id === sid)?.name ?? sid}`}
                className="rounded-full border border-primary bg-primary-soft px-3 py-1 text-sm font-semibold text-primary"
              >
                {subjects.find((s) => s.id === sid)?.name ?? sid} ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        id={`${id}-q`}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type a subject name, e.g. Engineering Mathematics"
        className="rounded-xl border border-border bg-bg px-3 py-2 text-sm"
      />
      {q && matches.length === 0 && (
        <p className="text-sm text-muted">No subject matches &ldquo;{query}&rdquo;.</p>
      )}
      {matches.length > 0 && (
        <ul className="flex flex-col gap-1">
          {matches.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  onChange([...selected, s.id]);
                  setQuery("");
                }}
                className="w-full rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-surface-2"
              >
                Add {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected.length === 0 && !q && (
        <p className="text-sm text-muted">Search above and add one or more subjects.</p>
      )}
    </div>
  );
}
