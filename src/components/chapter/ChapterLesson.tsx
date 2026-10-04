"use client";

import { useEffect, useState } from "react";
import { TopicBlock } from "@/components/chapter/TopicBlock";
import { Markdown } from "@/components/lesson/Markdown";
import type { LevelSlug } from "@/data/levels";
import { planTopics } from "@/lib/chapter/estimate";
import { fetchChapterParts, fetchTopicLesson } from "@/lib/chapter/fetchTopic";
import {
  ChapterPartsSchema,
  orderedBridges,
  topicDuration,
  type ChapterParts,
} from "@/lib/chapter/parts";
import { openChapterLesson, saveChapterParts, saveTopicLesson } from "@/lib/chapter/store";
import { studentContext } from "@/lib/chapter/studentContext";
import { errorCopy, type LessonErrorKind } from "@/lib/lessonEvents";
import { toPassages } from "@/lib/notes/notesSources";
import { findRelevantPassages } from "@/lib/notes/store";
import type { Lesson } from "@/lib/schema";
import { findChapter, findSubject } from "@/lib/subjects";

export type ChapterLessonProps = {
  subjectId: string;
  chapterId: string;
  topicIds: string[];
  level: LevelSlug;
  levelName: string;
  minutes: number;
  plan?: Record<string, number>;
  notes: boolean;
};

type TopicState = {
  id: string;
  name: string;
  minutes: number;
  recap: boolean;
  status: "waiting" | "loading" | "ready" | "error";
  stage?: string;
  kind?: LessonErrorKind;
  lesson?: Lesson;
};

type PartsState =
  | { status: "loading" }
  | { status: "ready"; parts: ChapterParts }
  | { status: "error"; kind: LessonErrorKind };

/**
 * A whole-chapter lesson, built in pieces (V2.5 · Step 4): the introduction first, then one
 * topic at a time. The student can start reading topic 1 while the rest are prepared, and
 * every finished topic is saved on this device, so leaving and coming back continues.
 */
export function ChapterLesson(props: ChapterLessonProps) {
  const subject = findSubject(props.subjectId)!;
  const chapter = findChapter(subject, props.chapterId)!;
  const [topics, setTopics] = useState<TopicState[]>([]);
  const [parts, setParts] = useState<PartsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const planKey = JSON.stringify([props.topicIds, props.plan ?? null]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const patch = (id: string, change: Partial<TopicState>) =>
      setTopics((list) => list.map((t) => (t.id === id ? { ...t, ...change } : t)));

    (async () => {
      const chosen = chapter.topics.filter((t) => props.topicIds.includes(t.id));
      const context = await studentContext(subject, chosen).catch(() => ({}));
      let plan = planTopics(
        {
          topics: chosen,
          allTopics: subject.chapters.flatMap((c) => c.topics),
          level: props.level,
          ...context,
        },
        props.minutes,
      );
      // The student's adjusted plan (from the plan page) decides minutes, order and skips.
      if (props.plan) {
        const saved = props.plan;
        plan = Object.keys(saved)
          .map((id) => plan.find((p) => p.id === id))
          .filter((p): p is (typeof plan)[number] => Boolean(p))
          .map((p) => ({ ...p, minutes: saved[p.id] }));
      }
      const order = plan.filter((p) => p.minutes > 0);
      const key = {
        subject: subject.id,
        chapter: chapter.id,
        level: props.level,
        minutes: props.minutes,
        order: order.map((p) => ({ id: p.id, minutes: p.minutes })),
        notes: props.notes,
      };
      const record = await openChapterLesson(key).catch(() => null);
      if (signal.aborted) return;
      setTopics(
        order.map((p) => {
          const done = record?.lessons[p.id]?.lesson;
          return {
            id: p.id,
            name: p.name,
            minutes: p.minutes,
            recap: p.recap,
            status: done ? "ready" : "waiting",
            ...(done ? { lesson: done } : {}),
          };
        }),
      );

      // The glue first (short), so the introduction appears straight away.
      const stored = ChapterPartsSchema.safeParse(record?.parts);
      if (stored.success) setParts({ status: "ready", parts: stored.data });
      else {
        setParts({ status: "loading" });
        const result = await fetchChapterParts(
          {
            subject: subject.id,
            chapter: chapter.id,
            level: props.level,
            minutes: props.minutes,
            order: key.order,
          },
          signal,
        );
        if (signal.aborted) return;
        if (result.ok) {
          setParts({ status: "ready", parts: result.parts });
          if (record) await saveChapterParts(record.id, result.parts).catch(() => undefined);
        } else setParts({ status: "error", kind: result.kind });
      }

      // Then each missing topic, in order. A failure stops the queue (quota is usually why).
      for (const p of order) {
        if (signal.aborted) return;
        if (record?.lessons[p.id]) continue;
        patch(p.id, { status: "loading", stage: "Getting started…" });
        const notes = props.notes
          ? toPassages(
              await findRelevantPassages(`${p.name} ${chapter.name}`, 8, subject.id).catch(
                () => [],
              ),
            )
          : [];
        const result = await fetchTopicLesson(
          {
            subject: subject.id,
            chapter: chapter.id,
            topic: p.id,
            level: props.level,
            duration: topicDuration(p.minutes),
            notes,
          },
          (stage) => patch(p.id, { stage }),
          signal,
        );
        if (signal.aborted) return;
        if (!result.ok) {
          patch(p.id, { status: "error", kind: result.kind });
          return;
        }
        patch(p.id, { status: "ready", lesson: result.lesson });
        if (record) {
          await saveTopicLesson(record.id, p.id, result.lesson, result.libraryKey).catch(
            () => undefined,
          );
        }
      }
    })().catch((err: unknown) => {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setParts((s) => (s.status === "loading" ? { status: "error", kind: "unavailable" } : s));
      }
    });
    return () => controller.abort();
    // planKey stands for the topic list and plan; subject and chapter follow from the ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planKey, props.level, props.minutes, props.notes, attempt]);

  const ready = topics.filter((t) => t.status === "ready").length;
  const bridges =
    parts.status === "ready"
      ? orderedBridges(
          parts.parts,
          topics.map((t) => ({ id: t.id, name: t.name })),
        )
      : [];
  const topicHref = (t: TopicState) =>
    `/lesson?${new URLSearchParams({
      subject: subject.id,
      chapter: chapter.id,
      topic: t.id,
      level: props.level,
      duration: String(topicDuration(t.minutes)),
      ...(props.notes ? { notes: "1" } : {}),
    })}`;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          {subject.name} › {chapter.name}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          {props.topicIds.length === chapter.topics.length
            ? chapter.name
            : `${chapter.name}: ${topics.length} topics`}
        </h1>
        <ul className="flex flex-wrap gap-2 text-sm">
          <li className="rounded-full bg-primary-soft px-3 py-1 font-medium text-primary">
            {props.levelName}
          </li>
          <li className="rounded-full border border-border bg-surface px-3 py-1">
            {props.minutes} min
          </li>
        </ul>
        {topics.length > 0 && ready < topics.length && (
          <div
            aria-live="polite"
            className="flex flex-col gap-1 text-sm"
            data-testid="build-progress"
          >
            <p>
              {ready} of {topics.length} topics ready
              {topics.some((t) => t.status === "loading") ? ": you can start reading now." : "."}
            </p>
            <progress className="h-2 w-full accent-primary" max={topics.length} value={ready} />
          </div>
        )}
        {topics.length > 0 && (
          <nav aria-label="Topics in this lesson" className="text-sm">
            <ol className="flex flex-wrap gap-2">
              {topics.map((t, i) => (
                <li key={t.id}>
                  <a
                    href={`#topic-${t.id}`}
                    className="inline-block rounded-full border border-border bg-surface px-3 py-1 hover:bg-surface-2"
                  >
                    {i + 1}. {t.name} · {t.minutes} min{t.status === "ready" ? "" : " …"}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </header>

      <Glue parts={parts} kind="intro" onRetry={() => setAttempt((a) => a + 1)} />

      {topics.map((t, i) => (
        <section
          key={t.id}
          id={`topic-${t.id}`}
          className="scroll-mt-24"
          data-testid="chapter-topic"
        >
          {t.status === "ready" && t.lesson ? (
            <TopicBlock
              lesson={t.lesson}
              index={i}
              minutes={t.minutes}
              recap={t.recap}
              href={topicHref(t)}
            />
          ) : (
            <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-border p-5">
              <p className="text-sm font-semibold text-primary">
                Topic {i + 1} · {t.minutes} min
              </p>
              <h2 className="text-xl font-bold">{t.name}</h2>
              {t.status === "waiting" && <p className="text-sm text-muted">Waiting its turn…</p>}
              {t.status === "loading" && (
                <p className="animate-pulse text-sm text-muted" aria-live="polite">
                  {t.stage ?? "Preparing…"}
                </p>
              )}
              {t.status === "error" && t.kind && (
                <div role="alert" className="flex flex-col gap-2 text-sm">
                  <p className="font-semibold">{errorCopy[t.kind].title}</p>
                  <p className="text-muted">
                    {errorCopy[t.kind].message} The topics already prepared are saved; the rest
                    continue from here.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAttempt((a) => a + 1)}
                    className="w-fit rounded-full bg-primary px-4 py-2 font-semibold text-primary-fg"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}
          {i < bridges.length && t.status === "ready" && (
            <div className="mt-6 rounded-xl bg-surface-2 px-4 py-3 text-sm">
              <Markdown>{bridges[i].text}</Markdown>
            </div>
          )}
        </section>
      ))}

      {topics.length > 0 && ready === topics.length && (
        <Glue parts={parts} kind="wrapUp" onRetry={() => setAttempt((a) => a + 1)} />
      )}
    </div>
  );
}

function Glue({
  parts,
  kind,
  onRetry,
}: {
  parts: PartsState;
  kind: "intro" | "wrapUp";
  onRetry: () => void;
}) {
  if (parts.status === "loading") {
    return kind === "intro" ? (
      <div className="h-28 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />
    ) : null;
  }
  if (parts.status === "error") {
    // The topics still work without the glue; offer to try again.
    return kind === "intro" ? (
      <p className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm">
        The chapter introduction couldn&apos;t be written right now (
        {errorCopy[parts.kind].title.toLowerCase()}).
        <button type="button" onClick={onRetry} className="font-semibold text-primary underline">
          Try again
        </button>
      </p>
    ) : null;
  }
  const p = parts.parts;
  return kind === "intro" ? (
    <section
      aria-labelledby="chapter-intro"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"
      data-testid="chapter-intro"
    >
      <h2 id="chapter-intro" className="text-xl font-semibold">
        Why this chapter matters
      </h2>
      <Markdown>{p.intro.whyItMatters}</Markdown>
      <h3 className="font-semibold">How the topics fit together</h3>
      <Markdown>{p.intro.map}</Markdown>
    </section>
  ) : (
    <section
      aria-labelledby="chapter-wrap"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5"
      data-testid="chapter-wrap"
    >
      <h2 id="chapter-wrap" className="text-xl font-semibold">
        Wrapping up the chapter
      </h2>
      <Markdown>{p.wrapUp.summary}</Markdown>
      <h3 className="font-semibold">Can you now…</h3>
      <ul className="list-disc pl-5">
        {p.wrapUp.keyIdeas.map((k) => (
          <li key={k}>
            <Markdown>{k}</Markdown>
          </li>
        ))}
      </ul>
    </section>
  );
}
