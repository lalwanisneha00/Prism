"use client";

import { Icon } from "@/components/Icon";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { LevelSlug } from "@/data/levels";
import {
  adjustPlan,
  MAX_SITTING_MINUTES,
  MIN_TOPIC_MINUTES,
  planTopics,
  splitPoint,
  type TopicPlan,
} from "@/lib/chapter/estimate";
import { chapterHref } from "@/lib/chapter/request";
import { studentContext } from "@/lib/chapter/studentContext";
import { findChapter, findSubject, type Subject } from "@/lib/subjects";

export type PlannerProps = {
  /** A subject that isn't built in (a student's own); otherwise looked up by id. */
  subject?: Subject;
  subjectId: string;
  chapterId: string;
  topicIds: string[];
  whole: boolean;
  level: LevelSlug;
  levelName: string;
  minutes: number;
  plan?: Record<string, number>;
  notes: boolean;
};

const STEP = 2;
const EXAM_LEVELS = new Set<LevelSlug>(["exam-prep", "last-minute"]);

/**
 * The plan before a chapter lesson is built: each topic with its minutes. The student can
 * give a topic more or less time, or skip it; the total stays the option they chose.
 */
export function ChapterPlanner(props: PlannerProps) {
  const subject = props.subject ?? findSubject(props.subjectId)!;
  const chapter = findChapter(subject, props.chapterId)!;
  const topics = chapter.topics.filter((t) => props.topicIds.includes(t.id));
  const [plan, setPlan] = useState<TopicPlan[] | null>(null);
  const topicKey = props.topicIds.join(",");

  useEffect(() => {
    let live = true;
    studentContext(subject, topics)
      .catch(() => ({}))
      .then((context) => {
        if (!live) return;
        let next = planTopics(
          {
            topics,
            allTopics: subject.chapters.flatMap((c) => c.topics),
            level: props.level,
            ...context,
          },
          props.minutes,
        );
        // Reopening an adjusted plan (the link keeps the student's changes).
        if (props.plan) {
          next = next.map((t) =>
            props.plan && t.id in props.plan
              ? { ...t, minutes: props.plan[t.id], skipped: props.plan[t.id] === 0 }
              : t,
          );
        }
        setPlan(next);
      });
    return () => {
      live = false;
    };
    // The ids stand for the topic list and the saved plan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, topicKey, props.level, props.minutes]);

  if (!plan) {
    return <div className="h-64 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;
  }

  const active = plan.filter((t) => !t.skipped);
  const total = active.reduce((a, t) => a + t.minutes, 0);
  const split = props.minutes > MAX_SITTING_MINUTES ? splitPoint(plan) : 0;
  const change = (id: string, c: { minutes?: number; skipped?: boolean }) =>
    setPlan((p) => (p ? adjustPlan(p, id, c, props.minutes) : p));
  const startHref = chapterHref("/chapter/lesson", {
    subject: subject.id,
    chapter: chapter.id,
    topics: props.whole ? undefined : props.topicIds,
    level: props.level,
    minutes: props.minutes,
    plan: Object.fromEntries(plan.map((t) => [t.id, t.skipped ? 0 : t.minutes])),
    notes: props.notes,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted">
          {subject.name} › {chapter.name}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {props.whole
            ? `${chapter.name}: the whole chapter`
            : `${topics.length} topics from ${chapter.name}`}
        </h1>
        <p className="mt-2 text-muted">
          {props.levelName} · {props.minutes} min ·{" "}
          {EXAM_LEVELS.has(props.level)
            ? "most important topics first"
            : "in an order where each topic builds on the last"}
        </p>
      </div>

      <section aria-labelledby="plan-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="plan-title" className="text-xl font-semibold">
            Your plan
          </h2>
          <p className="text-sm text-muted" aria-live="polite" data-testid="plan-total">
            Total: {total} of {props.minutes} min
          </p>
        </div>
        <p className="text-sm text-muted">
          Important and harder topics get more time; topics you&apos;ve already done get a short
          recap. Change any topic&apos;s time or skip it: the others adjust so the total stays the
          same.
        </p>
        <ol className="flex flex-col gap-2" data-testid="plan-list">
          {plan.map((t, i) => {
            const activeIndex = active.indexOf(t);
            return (
              <li key={t.id} className="flex flex-col gap-2">
                {split > 0 && activeIndex === split && (
                  <p className="rounded-lg bg-primary-soft px-3 py-2 text-center text-sm font-semibold text-primary">
                    <Icon name="break" /> Part 2 starts here: take a break
                  </p>
                )}
                <div
                  className={`flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 ${
                    t.skipped ? "opacity-60" : ""
                  }`}
                >
                  <span className="w-6 text-sm text-muted">{i + 1}.</span>
                  <div className="min-w-0 flex-[1_1_12rem]">
                    <p className="font-semibold break-words">{t.name}</p>
                    <p className="text-xs text-muted">
                      {t.skipped ? "Skipped" : t.recap ? "Short recap (you've studied it)" : ""}
                    </p>
                  </div>
                  {!t.skipped && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Less time for ${t.name}`}
                        disabled={t.minutes <= MIN_TOPIC_MINUTES}
                        onClick={() => change(t.id, { minutes: t.minutes - STEP })}
                        className="size-8 rounded-full border border-border font-semibold hover:bg-surface-2 disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="w-14 text-center text-sm font-semibold tabular-nums">
                        {t.minutes} min
                      </span>
                      <button
                        type="button"
                        aria-label={`More time for ${t.name}`}
                        disabled={active.length < 2}
                        onClick={() => change(t.id, { minutes: t.minutes + STEP })}
                        className="size-8 rounded-full border border-border font-semibold hover:bg-surface-2 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!t.skipped && active.length < 2}
                    onClick={() =>
                      change(t.id, { skipped: !t.skipped, minutes: MIN_TOPIC_MINUTES })
                    }
                    className="rounded-full border border-border px-3 py-1 text-sm font-semibold hover:bg-surface-2 disabled:opacity-40"
                  >
                    {t.skipped ? "Include" : "Skip"}
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={startHref}
          className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-fg hover:bg-primary-hover"
        >
          Start the lesson →
        </Link>
        <Link
          href="/"
          className="rounded-full border border-border px-6 py-3 font-semibold hover:bg-surface-2"
        >
          Change my choice
        </Link>
      </div>
    </div>
  );
}
