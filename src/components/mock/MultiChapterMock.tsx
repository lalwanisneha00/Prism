"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MockTestPanel } from "@/components/mock/MockTestPanel";
import type { TopicLesson } from "@/lib/chapter/extras";
import { lessonsByChapter } from "@/lib/mock/deviceLessons";
import { findSubject } from "@/lib/subjects";

/**
 * A mock test across several chapters of one subject (V3 · Step 3). Only chapters with
 * fact-checked lessons on this device can be chosen; the test is written from those.
 */
export function MultiChapterMock({ subjectId }: { subjectId: string }) {
  const subject = findSubject(subjectId)!;
  const [byChapter, setByChapter] = useState<Map<string, TopicLesson[]> | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    lessonsByChapter(subjectId)
      .then(setByChapter)
      .catch(() => setByChapter(new Map()));
  }, [subjectId]);

  if (!byChapter)
    return <div className="h-40 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;

  const available = subject.chapters.filter((c) => (byChapter.get(c.id)?.length ?? 0) > 0);
  const topics = chosen.flatMap((id) => byChapter.get(id) ?? []);
  const names = subject.chapters.filter((c) => chosen.includes(c.id)).map((c) => c.name);

  if (available.length === 0) {
    return (
      <p
        className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted"
        data-testid="mock-empty"
      >
        A mock test is written from the lessons you have studied, so it only asks about checked
        material. Study a few topics (or a whole chapter) of {subject.name} first, then come back.{" "}
        <Link
          href={`/?subject=${subject.id}#start`}
          className="font-semibold text-primary underline"
        >
          Start a lesson
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {!started && (
        <fieldset className="flex flex-col gap-2" data-testid="mock-chapters">
          <legend className="mb-2 font-semibold">Chapters in the test</legend>
          {subject.chapters.map((c) => {
            const lessons = byChapter.get(c.id) ?? [];
            return (
              <label
                key={c.id}
                className={`flex items-start gap-3 rounded-xl border border-border p-3 ${lessons.length ? "cursor-pointer" : "opacity-60"}`}
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  disabled={lessons.length === 0}
                  checked={chosen.includes(c.id)}
                  onChange={(e) =>
                    setChosen((list) =>
                      e.target.checked ? [...list, c.id] : list.filter((x) => x !== c.id),
                    )
                  }
                />
                <span className="min-w-0">
                  <span className="font-semibold">{c.name}</span>
                  <span className="block text-sm text-muted">
                    {lessons.length
                      ? `${lessons.length} of ${c.topics.length} topics studied`
                      : "No lessons studied yet"}
                  </span>
                </span>
              </label>
            );
          })}
          <button
            type="button"
            disabled={chosen.length === 0}
            onClick={() => setStarted(true)}
            className="mt-2 w-fit rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg disabled:opacity-60"
          >
            Continue with {chosen.length || "no"} {chosen.length === 1 ? "chapter" : "chapters"}
          </button>
        </fieldset>
      )}
      {started && (
        <>
          <p className="text-sm">
            <strong>{names.join(", ")}</strong> ·{" "}
            <button
              type="button"
              onClick={() => setStarted(false)}
              className="text-primary underline"
            >
              change chapters
            </button>
          </p>
          <MockTestPanel
            subjectId={subject.id}
            chapterIds={chosen}
            chapterName={names.join(", ")}
            level="exam-prep"
            topics={topics}
          />
        </>
      )}
    </div>
  );
}
