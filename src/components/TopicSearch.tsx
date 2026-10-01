"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import type { Subject } from "@/lib/subjects";
import { searchTopics, type TopicMatch } from "@/lib/topicSearch";

type TopicSearchProps = {
  subject: Subject;
  onPick: (match: TopicMatch) => void;
};

/** Type-to-search over every topic in the subject (an accessible combobox). */
export function TopicSearch({ subject, onPick }: TopicSearchProps) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [picked, setPicked] = useState("");

  const results = useMemo(() => searchTopics(subject, query), [subject, query]);
  const open = query.trim().length > 0;
  const listId = `${id}-results`;
  const optionId = (i: number) => `${id}-option-${i}`;

  function pick(match: TopicMatch) {
    onPick(match);
    setPicked(`Selected ${match.topic.name} (${match.chapter.name}).`);
    setQuery("");
    setActive(0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (event.key === "Enter") {
      // Enter picks a result; it must never submit the whole form from here.
      event.preventDefault();
      if (results[active]) pick(results[active]);
    } else if (event.key === "Escape") {
      setQuery("");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${id}-input`} className="font-semibold">
        Search topics
      </label>
      <input
        id={`${id}-input`}
        type="search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-activedescendant={open && results[active] ? optionId(active) : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder="e.g. gauss or capacitor"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setPicked("");
        }}
        onKeyDown={handleKeyDown}
        className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-fg placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      />

      {open && results.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching topics"
          className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface"
        >
          {results.map((match, i) => (
            <li
              key={match.topic.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              // Keep focus in the input so typing and arrow keys keep working.
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(match)}
              className="flex cursor-pointer flex-col gap-0.5 border-b border-border px-3 py-2.5 last:border-b-0 aria-selected:bg-primary-soft"
            >
              <span className="font-medium">{match.topic.name}</span>
              <span className="text-xs text-muted">{match.chapter.name}</span>
            </li>
          ))}
        </ul>
      )}

      <p role="status" className="text-sm text-muted empty:hidden">
        {open && results.length === 0
          ? `No topics match “${query.trim()}”. Try a shorter word, or choose a chapter below.`
          : picked}
      </p>
    </div>
  );
}
