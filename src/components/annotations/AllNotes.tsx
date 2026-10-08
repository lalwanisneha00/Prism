"use client";

import { Icon } from "@/components/Icon";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { HighlightLegend, swatchClass } from "@/components/annotations/ColorSwatch";
import { describeBlock } from "@/components/annotations/AnnotationEditor";
import { annotationHref, highlightColors, listAllAnnotations } from "@/lib/annotations/store";
import type { Annotation } from "@/lib/storage/db";
import { useMineFirst } from "@/components/subjects/useMineFirst";
import { findChapter, findSubject, subjects } from "@/lib/subjects";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; notes: Annotation[] };

const DAY = 86_400_000;
const select = "rounded-lg border border-border bg-surface px-2 py-1.5 text-sm";

/** Every highlight and comment across all lessons, with filters and search. */
export function AllNotes() {
  const id = useId();
  const orderedSubjects = useMineFirst(subjects);
  const dataVersion = useDataVersion();
  const [state, setState] = useState<State>({ status: "loading" });
  const [subject, setSubject] = useState("all");
  const [chapter, setChapter] = useState("all");
  const [color, setColor] = useState("all");
  const [days, setDays] = useState("all");
  const [query, setQuery] = useState("");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    listAllAnnotations()
      .then((notes) => setState({ status: "ready", notes }))
      .catch(() => setState({ status: "error" }));
  }, [dataVersion]);

  const notes = useMemo(() => (state.status === "ready" ? state.notes : []), [state]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => subject === "all" || n.subject === subject)
      .filter((n) => chapter === "all" || n.chapter === chapter)
      .filter((n) => color === "all" || (color === "none" ? !n.color : n.color === color))
      .filter((n) => days === "all" || n.updatedAt >= now - Number(days) * DAY)
      .filter(
        (n) =>
          !q ||
          [n.title, n.anchor?.quote ?? "", n.comment].some((t) => t.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, subject, chapter, color, days, query, now]);

  // Grouped by lesson, newest lesson activity first.
  const groups = useMemo(() => {
    const map = new Map<string, Annotation[]>();
    for (const n of shown) map.set(n.lessonId, [...(map.get(n.lessonId) ?? []), n]);
    return [...map.values()];
  }, [shown]);

  if (state.status === "loading")
    return <div className="h-48 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-2xl border border-border bg-surface p-5">
        This browser is blocking storage, so notes can&apos;t be shown here.
      </p>
    );
  }
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-surface-2 p-6">
        <p className="font-semibold">No highlights or comments yet</p>
        <p className="text-muted">
          In any lesson, select text and tap a colour to highlight it, or <Icon name="comment" /> to
          comment. Press <Icon name="note" /> on a section, worked example, chart or quiz question
          to add a note.
        </p>
        <HighlightLegend />
        <Link
          href="/start"
          className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover"
        >
          Start a lesson
        </Link>
      </div>
    );
  }

  const subj = findSubject(subject);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <label htmlFor={`${id}-q`} className="sr-only">
          Search your notes
        </label>
        <input
          id={`${id}-q`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search highlights, comments and topics…"
          className="w-full rounded-xl border border-border bg-bg px-3 py-2"
        />
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setChapter("all");
            }}
            className={select}
          >
            <option value="all">All subjects</option>
            {orderedSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Chapter"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            className={select}
            disabled={!subj}
          >
            <option value="all">All chapters</option>
            {subj?.chapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Colour"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className={select}
          >
            <option value="all">All colours</option>
            {highlightColors.map((c) => (
              <option key={c.color} value={c.color}>
                {c.label}
              </option>
            ))}
            <option value="none">Comments and notes</option>
          </select>
          <select
            aria-label="Date"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className={select}
          >
            <option value="all">Any time</option>
            <option value="1">Today</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
        <HighlightLegend />
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {shown.length} of {notes.length} notes
      </p>

      {groups.map((items) => {
        const first = items[0];
        const chap =
          findSubject(first.subject) && findChapter(findSubject(first.subject)!, first.chapter);
        return (
          <section key={first.lessonId} className="flex flex-col gap-2">
            <h2 className="font-semibold">
              {first.title}{" "}
              <span className="text-sm font-normal text-muted">
                · {chap?.name ?? first.chapter} · {first.level.replace(/-/g, " ")}
              </span>
            </h2>
            <ul className="flex flex-col gap-2">
              {items.map((n) => (
                <li key={n.id}>
                  <Link
                    href={annotationHref(n)}
                    className="flex items-start gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm hover:border-primary"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1 size-3 shrink-0 rounded-full ${n.color ? swatchClass[n.color] : "border-2 border-dotted border-primary"}`}
                    />
                    <span className="min-w-0 flex-1">
                      {n.anchor ? (
                        <span className="line-clamp-2">“{n.anchor.quote}”</span>
                      ) : (
                        <span className="text-muted">Note on {describeBlock(n.block)}</span>
                      )}
                      {n.comment.trim() && (
                        <span className="mt-1 block whitespace-pre-wrap text-muted">
                          <Icon name="comment" /> {n.comment}
                        </span>
                      )}
                      <span className="mt-1 block text-xs text-muted">
                        {new Date(n.updatedAt).toLocaleDateString()}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
