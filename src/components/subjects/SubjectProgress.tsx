"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTopicStatuses } from "@/components/map/useTopicStatuses";
import type { TopicStatus } from "@/lib/conceptMap";
import { listQuizAttempts, weakTopics } from "@/lib/storage/progress";
import type { QuizAttempt } from "@/lib/storage/db";
import { chaptersOf, findSubject } from "@/lib/subjects";

const dot: Record<TopicStatus, string> = {
  mastered: "bg-success",
  weak: "bg-danger",
  tried: "bg-warning",
  new: "bg-border",
};

/** A subject's chapters with the student's progress, and its weak topics. */
export function SubjectProgress({ subjectId }: { subjectId: string }) {
  const subject = findSubject(subjectId)!;
  const statuses = useTopicStatuses();
  const [weak, setWeak] = useState<QuizAttempt[]>([]);
  useEffect(() => {
    listQuizAttempts()
      .then((all) => setWeak(weakTopics(all).filter((a) => a.subject === subjectId)))
      .catch(() => setWeak([]));
  }, [subjectId]);

  const pickHref = (owner: string, chapter: string, topic?: string) =>
    `/?${new URLSearchParams({ subject: owner, chapter, ...(topic ? { topic } : {}) })}#start`;

  return (
    <div className="flex flex-col gap-6">
      {weak.length > 0 && (
        <section
          aria-labelledby="weak-title"
          className="rounded-2xl border border-danger/30 bg-danger/5 p-4"
        >
          <h2 id="weak-title" className="font-semibold">
            Weak topics to revise
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {weak.map((a) => (
              <li key={a.topic}>
                <Link
                  href={pickHref(a.subject, a.chapter, a.topic)}
                  className="rounded-full border border-border bg-surface px-3 py-1 hover:bg-surface-2"
                >
                  {a.title} · {a.score}/{a.total}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ol className="flex flex-col gap-4" data-testid="subject-chapters">
        {chaptersOf(subject).map(({ chapter, owner }, i) => {
          const s = chapter.topics.map((t) => statuses.get(t.id) ?? "new");
          const mastered = s.filter((x) => x === "mastered").length;
          return (
            <li
              key={`${owner.id}:${chapter.id}`}
              id={`chapter-${chapter.id}`}
              className="scroll-mt-24 rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">
                  {i + 1}. {chapter.name}
                  {owner.id !== subject.id && (
                    <span className="text-sm font-normal text-muted"> (from {owner.name})</span>
                  )}
                </h2>
                <p className="text-sm text-muted">
                  {mastered} of {chapter.topics.length} mastered
                  {chapter.hours ? ` · ${chapter.hours} syllabus hours` : ""}
                </p>
              </div>
              <progress
                className="mt-2 h-2 w-full accent-primary"
                max={chapter.topics.length}
                value={mastered}
                aria-label={`${chapter.name} progress`}
              />
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {chapter.topics.map((t, k) => (
                  <li key={t.id}>
                    <Link
                      href={pickHref(owner.id, chapter.id, t.id)}
                      className="flex items-center gap-2 rounded-full border border-border px-3 py-1 hover:bg-surface-2"
                    >
                      <span aria-hidden="true" className={`size-2 rounded-full ${dot[s[k]]}`} />
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={pickHref(owner.id, chapter.id)}
                className="mt-3 inline-block text-sm font-semibold text-primary underline"
              >
                Study this chapter →
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
