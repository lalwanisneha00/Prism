"use client";

import { Icon } from "@/components/Icon";
import { useEffect, useRef, useState } from "react";
import { ChapterAudio } from "@/components/chapter/ChapterAudio";
import { ChapterExtras } from "@/components/chapter/ChapterExtras";
import { ChapterMap } from "@/components/chapter/ChapterMap";
import { TopicBlock } from "@/components/chapter/TopicBlock";
import { Markdown } from "@/components/lesson/Markdown";
import type { LevelSlug } from "@/data/levels";
import { planTopics } from "@/lib/chapter/estimate";
import { breakPoints, minutesLeft, type TopicLesson } from "@/lib/chapter/extras";
import { fetchChapterParts, fetchTopicLesson } from "@/lib/chapter/fetchTopic";
import {
  ChapterPartsSchema,
  orderedBridges,
  topicDuration,
  type ChapterParts,
} from "@/lib/chapter/parts";
import {
  openChapterLesson,
  saveChapterParts,
  saveChapterProgress,
  saveTopicLesson,
} from "@/lib/chapter/store";
import { studentContext } from "@/lib/chapter/studentContext";
import { errorCopy, type LessonErrorKind } from "@/lib/lessonEvents";
import { toPassages } from "@/lib/notes/notesSources";
import { findRelevantPassages } from "@/lib/notes/store";
import type { Lesson } from "@/lib/schema";
import { recordRecent } from "@/lib/storage/library";
import { findChapter, findSubject, type Subject } from "@/lib/subjects";
import type { CustomSubjectPayload } from "@/lib/custom/customSubject";

export type ChapterLessonProps = {
  /** A subject that isn't built in (a student's own); otherwise looked up by id. */
  subject?: Subject;
  /** Sent with each request for a student's own subject (V3 · Step 4). */
  custom?: CustomSubjectPayload;
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
  const subject = props.subject ?? findSubject(props.subjectId)!;
  const chapter = findChapter(subject, props.chapterId)!;
  const [topics, setTopics] = useState<TopicState[]>([]);
  const [parts, setParts] = useState<PartsState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  // Reading progress (V2.5 · Step 5): which topics are finished, where the student was.
  const [recordId, setRecordId] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [resumeAt, setResumeAt] = useState<string | null>(null);
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
      if (record) {
        setRecordId(record.id);
        setDone(new Set(record.done ?? []));
        // Offer to jump back only when the student had moved past the first topic.
        if (record.position && record.position !== order[0]?.id) setResumeAt(record.position);
      }
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
            ...(props.custom ? { custom: props.custom } : {}),
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
            ...(props.custom ? { custom: props.custom } : {}),
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
  const topicHref = (t: { id: string; minutes: number }) =>
    `/lesson?${new URLSearchParams({
      subject: subject.id,
      chapter: chapter.id,
      topic: t.id,
      level: props.level,
      duration: String(topicDuration(t.minutes)),
      ...(props.notes ? { notes: "1" } : {}),
    })}`;
  const breaks = new Set(breakPoints(topics));
  const built: TopicLesson[] = topics
    .filter((t) => t.status === "ready" && t.lesson)
    .map((t) => ({ topicId: t.id, name: t.name, minutes: t.minutes, lesson: t.lesson! }));
  const allReady = topics.length > 0 && ready === topics.length;

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
        {resumeAt && topics.some((t) => t.id === resumeAt) && (
          <p
            className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft px-4 py-2 text-sm"
            data-testid="resume"
          >
            <span>
              Continue where you left off:{" "}
              <strong>{topics.find((t) => t.id === resumeAt)?.name}</strong>
            </span>
            <a
              href={`#topic-${resumeAt}`}
              onClick={() => setResumeAt(null)}
              className="font-semibold text-primary underline"
            >
              Jump there
            </a>
          </p>
        )}
      </header>

      {topics.length > 0 && <ReadingBar topics={topics} done={done} />}

      <Glue parts={parts} kind="intro" onRetry={() => setAttempt((a) => a + 1)} />

      {topics.length > 1 && (
        <details className="rounded-2xl border border-border bg-surface p-4">
          <summary className="cursor-pointer font-semibold">Concept map of this lesson</summary>
          <div className="mt-4">
            <ChapterMap
              subject={subject}
              topicIds={topics.map((t) => t.id)}
              hrefFor={(id) => topicHref(topics.find((t) => t.id === id) ?? { id, minutes: 10 })}
            />
          </div>
        </details>
      )}

      {recordId && built.length > 0 && (
        <ChapterAudio
          key={`${recordId}-${allReady ? "all" : "some"}`}
          id={recordId}
          title={chapter.name}
          minutes={props.minutes}
          parts={parts.status === "ready" ? parts.parts : null}
          topics={built}
        />
      )}

      {topics.map((t, i) => (
        <section
          key={t.id}
          id={`topic-${t.id}`}
          data-topic-section={t.id}
          className="scroll-mt-28"
          data-testid="chapter-topic"
        >
          {t.status === "ready" && t.lesson ? (
            <>
              <TopicBlock
                lesson={t.lesson}
                index={i}
                minutes={t.minutes}
                recap={t.recap}
                href={topicHref(t)}
              />
              <TopicEnd topicId={t.id} done={done.has(t.id)} />
            </>
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
          {breaks.has(i) && (
            <p
              className="mt-6 rounded-xl border border-dashed border-primary/40 px-4 py-3 text-center text-sm font-semibold text-primary"
              data-testid="break-marker"
            >
              <Icon name="break" /> Good moment for a 5-minute break. Your place is saved.
            </p>
          )}
        </section>
      ))}

      {allReady && <Glue parts={parts} kind="wrapUp" onRetry={() => setAttempt((a) => a + 1)} />}

      {allReady && (
        <ChapterExtras
          custom={props.custom}
          subjectId={subject.id}
          chapterId={chapter.id}
          chapterName={chapter.name}
          level={props.level}
          topics={built}
        />
      )}

      {recordId && (
        <ProgressTracker
          recordId={recordId}
          topics={topics}
          onDone={(id) => {
            setDone((d) => new Set(d).add(id));
            const t = topics.find((x) => x.id === id);
            if (t) {
              void recordRecent({
                subject: subject.id,
                chapter: chapter.id,
                topic: t.id,
                level: props.level,
                duration: topicDuration(t.minutes),
                title: t.name,
                chapterName: chapter.name,
              }).catch(() => undefined);
            }
          }}
        />
      )}
    </div>
  );
}

/** A marker at the end of each topic: reaching it marks the topic as finished. */
function TopicEnd({ topicId, done }: { topicId: string; done: boolean }) {
  return (
    <p data-topic-end={topicId} className="mt-4 text-sm text-muted">
      {done ? "✓ Topic finished" : ""}
    </p>
  );
}

/**
 * The sticky bar at the top while reading: progress, time left, and every topic with its
 * minutes and a tick once finished, to jump to any of them.
 */
function ReadingBar({
  topics,
  done,
}: {
  topics: { id: string; name: string; minutes: number; status: string }[];
  done: ReadonlySet<string>;
}) {
  const finished = topics.filter((t) => done.has(t.id)).length;
  const left = minutesLeft(topics, done);
  return (
    <nav
      aria-label="Topics in this lesson"
      className="sticky top-0 z-20 -mx-4 border-b border-border bg-bg/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-xl sm:border"
      data-testid="reading-bar"
    >
      <details>
        <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-semibold">
            {finished} of {topics.length} topics done
          </span>
          <span className="text-muted">about {left} min left</span>
          <progress
            className="h-2 min-w-24 flex-1 accent-primary"
            max={topics.length}
            value={finished}
            aria-label="Reading progress"
          />
          <span className="text-primary">Topics ▾</span>
        </summary>
        <ol className="mt-2 flex max-h-72 flex-col gap-1 overflow-auto text-sm">
          {topics.map((t, i) => (
            <li key={t.id}>
              <a
                href={`#topic-${t.id}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-surface-2"
              >
                <span aria-hidden="true" className="w-4">
                  {done.has(t.id) ? "✓" : ""}
                </span>
                <span className="min-w-0 flex-1">
                  {i + 1}. {t.name}
                  {done.has(t.id) && <span className="sr-only"> (finished)</span>}
                </span>
                <span className="text-muted tabular-nums">
                  {t.minutes} min{t.status === "ready" ? "" : " …"}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  );
}

/**
 * Watches the page: the topic in view is saved as the reading position, and a topic whose
 * end marker scrolls into view is marked finished. Saves are spaced out (not every scroll).
 */
function ProgressTracker({
  recordId,
  topics,
  onDone,
}: {
  recordId: string;
  topics: { id: string; status: string }[];
  onDone: (id: string) => void;
}) {
  const latest = useRef(onDone);
  useEffect(() => {
    latest.current = onDone;
  });
  const readyKey = topics
    .filter((t) => t.status === "ready")
    .map((t) => t.id)
    .join(",");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const seen = new Set<string>();
    const ends = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const id = (e.target as HTMLElement).dataset.topicEnd;
        if (e.isIntersecting && id && !seen.has(id)) {
          seen.add(id);
          void saveChapterProgress(recordId, { done: id }).catch(() => undefined);
          latest.current(id);
        }
      }
    });
    const sections = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        const id = visible && (visible.target as HTMLElement).dataset.topicSection;
        if (!id) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          void saveChapterProgress(recordId, { position: id }).catch(() => undefined);
        }, 1500);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    document.querySelectorAll<HTMLElement>("[data-topic-end]").forEach((el) => ends.observe(el));
    document
      .querySelectorAll<HTMLElement>("[data-topic-section]")
      .forEach((el) => sections.observe(el));
    return () => {
      clearTimeout(timer);
      ends.disconnect();
      sections.disconnect();
    };
  }, [recordId, readyKey]);
  return null;
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
