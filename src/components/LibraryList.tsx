"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import { findLevel } from "@/data/levels";
import { findChapter, findSubject } from "@/lib/subjects";
import type { SavedLesson } from "@/lib/storage/db";
import { listSavedLessons, unsaveLesson } from "@/lib/storage/library";

type State =
  { status: "loading" } | { status: "ready"; items: SavedLesson[] } | { status: "error" };

/** Every lesson saved on this device, newest first. */
export function LibraryList() {
  const { dataVersion } = useAuth();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    listSavedLessons()
      .then((items) => setState({ status: "ready", items }))
      .catch(() => setState({ status: "error" }));
  }, [dataVersion]);

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {[0, 1].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="rounded-2xl border border-border bg-surface p-5">
        This browser is blocking storage (for example in private browsing), so lessons can&apos;t be
        saved here.
      </p>
    );
  }
  if (state.items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-surface-2 p-6">
        <p className="font-semibold">No saved lessons yet</p>
        <p className="text-muted">
          Open any lesson and press <span className="font-semibold">☆ Save lesson</span>. Saved
          lessons open instantly and work without internet.
        </p>
        <Link
          href="/start"
          className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover"
        >
          Start a lesson
        </Link>
      </div>
    );
  }

  async function remove(id: string) {
    await unsaveLesson(id);
    setState((s) =>
      s.status === "ready" ? { ...s, items: s.items.filter((i) => i.id !== id) } : s,
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {state.items.map(({ id, lesson, savedAt }) => {
        const { subject, chapter, topic, level, durationMin, title } = lesson.meta;
        const subj = findSubject(subject);
        const chap = subj && findChapter(subj, chapter);
        const params = new URLSearchParams({
          subject,
          chapter,
          topic,
          level,
          duration: String(durationMin),
        });
        if (lesson.meta.fromNotes) params.set("notes", "1");
        return (
          <li
            key={id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
          >
            <Link href={`/lesson?${params}`} className="flex min-w-0 flex-col hover:underline">
              <span className="font-semibold">{title}</span>
              <span className="text-sm text-muted">
                {chap?.name ?? chapter} · {findLevel(level)?.name ?? level} · {durationMin} min ·
                saved {new Date(savedAt).toLocaleDateString()}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => remove(id)}
              className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
              aria-label={`Remove ${title} from your library`}
            >
              Remove
            </button>
          </li>
        );
      })}
    </ul>
  );
}
