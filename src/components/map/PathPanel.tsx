"use client";

import Link from "next/link";
import { defaultDuration } from "@/data/durations";
import { estimateChapter } from "@/lib/chapter/estimate";
import { chapterHref } from "@/lib/chapter/request";
import type { TopicStatus } from "@/lib/conceptMap";
import type { PrereqGraph } from "@/lib/graph/prereqGraph";
import type { Subject } from "@/lib/subjects";

/** A topic counts as done once its latest quiz was passed (mastered) or attempted well enough. */
const isDone = (s: TopicStatus | undefined) => s === "mastered" || s === "tried";

export function topicLessonHref(subjectId: string, chapterId: string, topicId: string): string {
  return `/lesson?${new URLSearchParams({
    subject: subjectId,
    chapter: chapterId,
    topic: topicId,
    level: "first-encounter",
    duration: String(defaultDuration),
  })}`;
}

/**
 * The side panel for the selected topic: what to study before it, in order (with ticks for
 * topics already done), shortcuts to start, and, in a lighter style, what it unlocks next.
 */
export function PathPanel({
  subject,
  graph,
  selected,
  order,
  next,
  statuses,
}: {
  subject: Subject;
  graph: PrereqGraph;
  selected: string | null;
  /** The study order ending at the selected topic. */
  order: string[];
  next: string[];
  statuses: Map<string, TopicStatus>;
}) {
  const topic = selected ? graph.topics.find((t) => t.id === selected) : undefined;
  if (!topic) {
    return (
      <aside
        className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted"
        data-testid="path-panel"
      >
        Hover, tap or Tab to a topic to see everything to study before it, in order.
      </aside>
    );
  }
  const byId = new Map(graph.topics.map((t) => [t.id, t]));
  const before = order.filter((id) => id !== topic.id);
  const firstUnfinished = order.find((id) => !isDone(statuses.get(id))) ?? topic.id;
  const start = byId.get(firstUnfinished)!;

  // The whole path as multi-topic lessons, one per chapter (a lesson covers one chapter).
  const groups: { chapterId: string; chapterName: string; ids: string[] }[] = [];
  for (const id of order) {
    const t = byId.get(id)!;
    const last = groups[groups.length - 1];
    if (last && last.chapterId === t.chapterId) last.ids.push(id);
    else groups.push({ chapterId: t.chapterId, chapterName: t.chapterName, ids: [id] });
  }
  const groupHref = (g: (typeof groups)[number]) => {
    const chapter = subject.chapters.find((c) => c.id === g.chapterId)!;
    const topics = chapter.topics.filter((t) => g.ids.includes(t.id));
    const estimate = estimateChapter({
      topics,
      allTopics: subject.chapters.flatMap((c) => c.topics),
      level: "first-encounter",
    });
    const minutes = estimate.options.find((o) => o.name === estimate.recommended)?.minutes ?? 30;
    return chapterHref("/chapter", {
      subject: subject.id,
      chapter: chapter.id,
      topics: g.ids,
      level: "first-encounter",
      minutes,
    });
  };

  return (
    <aside
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-sm"
      data-testid="path-panel"
    >
      <div>
        <p className="text-xs text-muted">{topic.chapterName}</p>
        <h2 className="text-lg font-semibold">{topic.name}</h2>
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-semibold">
          {before.length
            ? "Before this topic, study these in order:"
            : "Nothing to study first: you can start here."}
        </p>
        {before.length > 0 && (
          <ol className="flex flex-col gap-1" data-testid="path-list">
            {before.map((id, i) => {
              const t = byId.get(id)!;
              const done = isDone(statuses.get(id));
              return (
                <li key={id} className="flex items-start gap-2">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-fg">
                    {i + 1}
                  </span>
                  <Link
                    href={topicLessonHref(subject.id, t.chapterId, t.id)}
                    className="min-w-0 flex-1 hover:underline"
                  >
                    {t.name}
                  </Link>
                  {done && (
                    <span className="text-success" aria-label="done">
                      ✓
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={topicLessonHref(subject.id, start.chapterId, start.id)}
          className="rounded-full bg-primary px-4 py-2 font-semibold text-primary-fg hover:bg-primary-hover"
        >
          {before.length
            ? `Start with the first unfinished one: ${start.name}`
            : `Start ${topic.name}`}
        </Link>
        {groups.length === 1 && order.length > 1 && (
          <Link
            href={groupHref(groups[0])}
            className="rounded-full border border-border px-4 py-2 font-semibold hover:bg-surface-2"
          >
            Study this whole path
          </Link>
        )}
      </div>
      {groups.length > 1 && (
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Study this whole path, chapter by chapter:</p>
          <ol className="flex flex-col gap-1">
            {groups.map((g, i) => (
              <li key={`${g.chapterId}-${i}`}>
                <Link href={groupHref(g)} className="text-primary underline">
                  {g.chapterName}: {g.ids.length} {g.ids.length === 1 ? "topic" : "topics"}
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
      {next.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-dashed border-border pt-3 text-muted">
          <p className="text-xs uppercase">This topic unlocks</p>
          <ul className="flex flex-wrap gap-1.5">
            {next.map((id) => (
              <li
                key={id}
                className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs"
              >
                {byId.get(id)?.name ?? id}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
