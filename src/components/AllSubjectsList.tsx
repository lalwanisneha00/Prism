"use client";

import Link from "next/link";
import { SubjectFlag } from "@/components/flags/SubjectFlag";
import { useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { SearchKindFilter } from "@/components/subjects/SearchKindFilter";
import type { SearchKind } from "@/lib/catalogueSearch";
import type { Offering } from "@/lib/subjects";

type Option = { id: string; name: string; field: string; offerings?: readonly Offering[] };

/**
 * A collapsed list of every subject with a search box (closed by default, never one long list).
 * With `labs`, it also lists labs (All / Theory / Labs); the student's semester labs come right
 * after their semester's subjects. A lab opens its own page: lab lessons arrive in Phase 7B.
 */
export function AllSubjectsList({
  subjects,
  currentId,
  firstIds = [],
  labs = [],
  firstLabIds = [],
  onSelect,
}: {
  subjects: readonly Option[];
  currentId: string;
  /** Subjects to list first (the student's own, their branch and semester). */
  firstIds?: readonly string[];
  /** Labs (practical courses), listed apart from the subjects a lesson can be built for. */
  labs?: readonly Option[];
  /** Labs of the student's branch and semester, listed first among the labs. */
  firstLabIds?: readonly string[];
  onSelect: (id: string) => void;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<SearchKind>("all");
  const details = useRef<HTMLDetailsElement>(null);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ok = (s: Option) =>
      !q || s.name.toLowerCase().includes(q) || s.field.toLowerCase().includes(q);
    const pick = (list: readonly Option[], ids: readonly string[]) =>
      ids.map((fid) => list.find((s) => s.id === fid)).filter((s): s is Option => Boolean(s));
    const theory = kind === "labs" ? [] : subjects;
    const labList = kind === "theory" ? [] : labs;
    const tagged = (list: readonly Option[], lab: boolean) => list.map((s) => ({ ...s, lab }));
    // My semester's subjects, then my semester's labs, then everything else.
    const ordered = [
      ...tagged(pick(theory, firstIds), false),
      ...tagged(pick(labList, firstLabIds), true),
      ...tagged(
        theory.filter((s) => !firstIds.includes(s.id)),
        false,
      ),
      ...tagged(
        labList.filter((s) => !firstLabIds.includes(s.id)),
        true,
      ),
    ];
    // Each subject once, even if it is in both lists or repeated in the data.
    const seen = new Set<string>();
    return ordered.filter((s) => ok(s) && !seen.has(s.id) && seen.add(s.id));
  }, [subjects, labs, query, kind, firstIds, firstLabIds]);

  const close = () => {
    setQuery("");
    if (details.current) details.current.open = false;
  };

  return (
    <details
      ref={details}
      className="rounded-xl border border-border bg-surface"
      data-testid="all-subjects-list"
      suppressHydrationWarning
    >
      <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold">
        All subjects on Prism{" "}
        <span className="font-normal text-muted">
          ({subjects.length}
          {labs.length > 0 ? ` + ${labs.length} labs` : ""})
        </span>
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
        {labs.length > 0 && <SearchKindFilter value={kind} onChange={setKind} />}
        <ul className="grid max-h-72 gap-1 overflow-y-auto sm:grid-cols-2">
          {shown.map((s) => (
            <li key={s.id} className="flex items-start gap-1">
              {s.lab ? (
                <Link
                  href={`/subjects/${s.id}`}
                  onClick={close}
                  data-testid="all-subjects-lab"
                  className="block min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2"
                >
                  {s.name}
                  <span className="flex items-center gap-1 text-xs font-normal text-muted">
                    <Icon name="lab" />
                    Lab · opens its experiments (lab lessons coming soon)
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  aria-pressed={s.id === currentId}
                  onClick={() => {
                    onSelect(s.id);
                    // Back to the collapsed list once a subject is chosen.
                    close();
                  }}
                  className={`block min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2 ${s.id === currentId ? "font-semibold text-primary" : ""}`}
                >
                  {s.name}
                  <span className="block text-xs font-normal text-muted">{s.field}</span>
                </button>
              )}
              <SubjectFlag subjectId={s.id} />
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
