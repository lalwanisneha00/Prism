"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { findLevel } from "@/data/levels";
import { chapterHref } from "@/lib/chapter/request";
import { listChapterLessons } from "@/lib/chapter/store";
import { listMockResults } from "@/lib/mock/results";
import type { ChapterLessonRecord, MockResult } from "@/lib/storage/db";
import { findChapter, findSubject } from "@/lib/subjects";

/** The link that reopens a stored chapter lesson exactly as it was planned. */
export function chapterLessonHref(r: ChapterLessonRecord): string {
  return chapterHref("/chapter/lesson", {
    subject: r.subject,
    chapter: r.chapter,
    topics: r.order.map((o) => o.id),
    level: r.level,
    minutes: r.minutes,
    plan: Object.fromEntries(r.order.map((o) => [o.id, o.minutes])),
    notes: r.notes,
  });
}

/** Dashboard: unfinished chapter lessons ("continue where you left off") and recent mock tests. */
export function DashboardChapterCards({
  Card,
}: {
  Card: (props: { title: string; children: React.ReactNode }) => React.ReactNode;
}) {
  const [lessons, setLessons] = useState<ChapterLessonRecord[] | null>(null);
  const [mocks, setMocks] = useState<MockResult[] | null>(null);
  useEffect(() => {
    listChapterLessons()
      .then((all) => setLessons(all.filter((r) => (r.done?.length ?? 0) < r.order.length)))
      .catch(() => setLessons([]));
    listMockResults()
      .then(setMocks)
      .catch(() => setMocks([]));
  }, []);

  return (
    <>
      {lessons && lessons.length > 0 && (
        <Card title="Continue your chapter lesson">
          <ul className="flex flex-col gap-2 text-sm">
            {lessons.slice(0, 3).map((r) => {
              const subject = findSubject(r.subject);
              const chapter = subject && findChapter(subject, r.chapter);
              const position = chapter?.topics.find((t) => t.id === r.position);
              return (
                <li key={r.id}>
                  <Link
                    href={chapterLessonHref(r)}
                    className="flex flex-col rounded-xl bg-primary-soft p-3 hover:opacity-90"
                  >
                    <span className="font-semibold">{chapter?.name ?? r.chapter}</span>
                    <span className="text-muted">
                      {r.done?.length ?? 0} of {r.order.length} topics done ·{" "}
                      {findLevel(r.level)?.name ?? r.level} · {r.minutes} min
                      {position ? ` · at ${position.name}` : ""}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <Card title="Recent mock tests">
        {mocks && mocks.length > 0 ? (
          <ul className="flex flex-col gap-1 text-sm">
            {mocks.slice(0, 5).map((m) => (
              <li key={m.id} className="flex justify-between gap-3">
                <span>
                  {m.title} <span className="text-muted">· {m.minutes} min</span>
                </span>
                <span className="font-semibold">
                  {m.score}/{m.total}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            No mock tests yet. Finish a whole-chapter lesson to take one.
          </p>
        )}
      </Card>
    </>
  );
}
