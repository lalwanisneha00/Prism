"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChoiceCard } from "@/components/form/ChoiceCard";
import type { LevelSlug } from "@/data/levels";
import { estimateChapter, type ChapterEstimate } from "@/lib/chapter/estimate";
import { studentContext } from "@/lib/chapter/studentContext";
import type { Chapter, Subject, Topic } from "@/lib/subjects";

/**
 * The three time options for a chapter or several topics (Quick / Standard / Thorough),
 * computed for this chapter, level and student, with an honest "Why these timings?".
 */
export function ChapterTimeOptions({
  subject,
  chapter,
  topics,
  level,
  value,
  onChange,
}: {
  subject: Subject;
  chapter: Chapter;
  topics: readonly Topic[];
  level: LevelSlug;
  value: number | null;
  onChange: (minutes: number) => void;
}) {
  const [context, setContext] = useState<Awaited<ReturnType<typeof studentContext>> | null>(null);
  const topicKey = topics.map((t) => t.id).join(",");

  useEffect(() => {
    let live = true;
    studentContext(subject, topics)
      .then((c) => live && setContext(c))
      .catch(() => live && setContext({}));
    return () => {
      live = false;
    };
    // topicKey stands for the topic list (a new array on every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, topicKey]);

  const estimate = context
    ? estimateChapter({
        topics: [...topics],
        allTopics: subject.chapters.flatMap((c) => c.topics),
        level,
        ...(chapter.hours ? { hours: chapter.hours } : {}),
        ...(chapter.marks ? { marks: chapter.marks } : {}),
        ...context,
      })
    : null;
  const choices = estimate?.options.map((o) => o.minutes).join(",") ?? "";
  const recommended = estimate?.options.find((o) => o.name === estimate.recommended)?.minutes;

  // Start on the recommended option, and again whenever the options change.
  useEffect(() => {
    if (
      recommended !== undefined &&
      (value === null || !choices.split(",").includes(String(value)))
    ) {
      onChange(recommended);
    }
  }, [choices, recommended, value, onChange]);

  if (!estimate) {
    return <div className="h-24 animate-pulse rounded-xl bg-surface-2" aria-busy="true" />;
  }
  return (
    <TimeOptionCards estimate={estimate} subjectId={subject.id} value={value} onChange={onChange} />
  );
}

function TimeOptionCards({
  estimate,
  subjectId,
  value,
  onChange,
}: {
  estimate: ChapterEstimate;
  subjectId: string;
  value: number | null;
  onChange: (minutes: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 pt-2 sm:grid-cols-3" data-testid="time-options">
        {estimate.options.map((o) => (
          <ChoiceCard
            key={o.name}
            name="chapter-minutes"
            value={String(o.minutes)}
            checked={value === o.minutes}
            onSelect={() => onChange(o.minutes)}
            title={`${o.label} · ${o.minutes} min${o.name === estimate.recommended ? " ★" : ""}`}
            description={o.parts ? `In 2 parts: ${o.parts.join(" + ")} min` : undefined}
            badge={o.name === estimate.recommended ? "Recommended" : undefined}
          />
        ))}
      </div>
      <details className="rounded-xl bg-surface-2 p-3 text-sm" data-testid="why-timings">
        <summary className="cursor-pointer font-semibold">Why these timings?</summary>
        <ul className="mt-2 list-disc pl-5">
          {estimate.factors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        {estimate.sizeOnly && (
          <p className="mt-2 text-muted">
            This estimate is based on the chapter&apos;s size and difficulty only: Prism
            doesn&apos;t know your university&apos;s exam weightage.{" "}
            <Link href={`/notes?subject=${subjectId}`} className="text-primary underline">
              Upload previous-year papers
            </Link>{" "}
            for a better estimate.
          </p>
        )}
      </details>
    </div>
  );
}
