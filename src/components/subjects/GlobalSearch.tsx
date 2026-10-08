"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { matchHref, searchCatalogue, type CatalogueMatch } from "@/lib/catalogueSearch";
import { JUMP_TO_LEVEL } from "@/lib/pickerJump";

const kindLabel = { subject: "Subject", chapter: "Chapter", topic: "Topic" } as const;

function title(m: CatalogueMatch): string {
  if (m.kind === "subject") return m.subject.name;
  if (m.kind === "chapter") return m.chapter.name;
  return m.topic.name;
}

function context(m: CatalogueMatch): string {
  if (m.kind === "subject") return m.subject.field;
  if (m.kind === "chapter") return m.subject.name;
  return `${m.subject.name} › ${m.chapter.name}`;
}

/** Choosing a topic: the lesson maker should land on "How well do you know it?". */
function markJump(m: CatalogueMatch) {
  if (m.kind !== "topic") return;
  try {
    sessionStorage.setItem(JUMP_TO_LEVEL, "1");
  } catch {
    // Storage is blocked: no jump.
  }
}

/** One search box for any subject, chapter or topic in the catalogue. */
export function GlobalSearch() {
  const id = useId();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => searchCatalogue(query, 8), [query]);
  // The list shows while typing; once a result is chosen it folds away until the box is clicked again.
  const [shown, setShown] = useState(true);
  const open = shown && query.trim().length > 0;

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      setShown(false);
      markJump(results[active]);
      router.push(matchHref(results[active]));
    } else if (e.key === "Escape") setQuery("");
  }

  return (
    <div
      className="relative flex flex-col gap-2"
      data-testid="global-search"
      onBlur={(e) => {
        // Leaving the search (not just moving to one of its results) folds the list away.
        if (!e.currentTarget.contains(e.relatedTarget)) setShown(false);
      }}
    >
      <label htmlFor={`${id}-q`} className="font-semibold">
        Search any subject, chapter or topic
      </label>
      <input
        id={`${id}-q`}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && results[active] ? `${id}-o${active}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setShown(true);
        }}
        onFocus={() => setShown(true)}
        onClick={() => setShown(true)}
        onKeyDown={onKeyDown}
        placeholder="e.g. Gauss, Taylor series, eigenvalues"
        autoComplete="off"
        className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-fg focus-visible:outline-2 focus-visible:outline-primary"
      />
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-1"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">
              Nothing found. Try another word, or add your own subject.
            </li>
          ) : (
            results.map((m, i) => (
              <li
                key={`${m.kind}-${m.subject.id}-${title(m)}`}
                id={`${id}-o${i}`}
                role="option"
                aria-selected={i === active}
              >
                <Link
                  href={matchHref(m)}
                  onClick={() => {
                    setShown(false);
                    markJump(m);
                  }}
                  className={`flex flex-col rounded-lg px-3 py-2 text-sm ${i === active ? "bg-surface-2" : "hover:bg-surface-2"}`}
                >
                  <span className="font-semibold">{title(m)}</span>
                  <span className="text-xs text-muted">
                    {kindLabel[m.kind]} · {context(m)}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
