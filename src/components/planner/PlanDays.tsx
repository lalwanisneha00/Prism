"use client";

import Link from "next/link";
import { useState } from "react";
import { addDays, planProgress } from "@/lib/planner/plan";
import { setItemDone } from "@/lib/planner/store";
import { localDate } from "@/lib/progress/tracker";
import type { StudyPlan } from "@/lib/storage/db";
import { findChapter, findTopic, type Subject } from "@/lib/subjects";

type Item = StudyPlan["days"][number]["items"][number];

function dayLabel(date: string, today: string): string {
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

/** Where an item's link goes, and what it is called. */
export function itemLink(
  plan: StudyPlan,
  subject: Subject,
  item: Item,
): { href: string; label: string } {
  if (item.kind === "flashcards") return { href: "/flashcards", label: "Review due flashcards" };
  const chapter = subject.chapters.find((c) => c.topics.some((t) => t.id === item.topicId));
  const topic = chapter && findTopic(chapter, item.topicId ?? "");
  if (!chapter || !topic) return { href: "/", label: item.topicId ?? "" };
  const revise = item.kind === "revise";
  const params = new URLSearchParams({
    subject: subject.id,
    chapter: findChapter(subject, chapter.id)!.id,
    topic: topic.id,
    level: revise ? "last-minute" : plan.level,
    duration: String(revise ? 5 : plan.lessonMinutes),
  });
  return { href: `/lesson?${params}`, label: revise ? `Revise: ${topic.name}` : topic.name };
}

/** The plan, day by day, with tick boxes (each tick syncs). */
export function PlanDays({
  plan,
  subject,
  onChange,
  onReplan,
  onDelete,
}: {
  plan: StudyPlan;
  subject: Subject;
  onChange: (plan: StudyPlan) => void;
  onReplan: () => void;
  onDelete: () => void;
}) {
  const [today] = useState(() => localDate(Date.now()));
  const progress = planProgress(plan.days);
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const lateItems = plan.days
    .filter((d) => d.date < today)
    .flatMap((d) => d.items.filter((i) => !i.done));
  const topicName = (id: string) =>
    subject.chapters.flatMap((c) => c.topics).find((t) => t.id === id)?.name ?? id;

  async function toggle(item: Item) {
    onChange(await setItemDone(plan, item.id, !item.done));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">
            {progress.done} of {progress.total} done ·{" "}
            {Math.round((progress.minutesDone / 60) * 10) / 10} h studied
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onReplan}
              className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
            >
              New plan
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-full border border-danger/40 px-3 py-1.5 text-sm font-semibold text-danger hover:bg-danger/10"
            >
              Delete
            </button>
          </div>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Plan progress"
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        {plan.examDate && (
          <p className="text-sm text-muted">
            Exam on {new Date(plan.examDate).toLocaleDateString()}.
          </p>
        )}
        {lateItems.length > 0 && (
          <p className="text-sm text-warning">
            {lateItems.length} item{lateItems.length === 1 ? "" : "s"} from earlier days not done
            yet: no stress, catch up or make a new plan.
          </p>
        )}
      </div>

      <ol className="flex flex-col gap-3">
        {plan.days.map((day) => {
          const minutes = day.items.reduce((s, i) => s + i.minutes, 0);
          const isToday = day.date === today;
          return (
            <li
              key={day.date}
              className={`rounded-2xl border bg-surface p-4 ${isToday ? "border-primary" : "border-border"} ${day.date < today ? "opacity-75" : ""}`}
            >
              <p className="flex items-baseline justify-between gap-2">
                <span className={`font-semibold ${isToday ? "text-primary" : ""}`}>
                  {dayLabel(day.date, today)}
                </span>
                <span className="text-xs text-muted">{minutes} min</span>
              </p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {day.items.map((item) => {
                  const link = itemLink(plan, subject, item);
                  return (
                    <li key={item.id} className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() => void toggle(item)}
                        aria-label={`Done: ${link.label}`}
                        className="size-4 shrink-0 accent-primary"
                      />
                      <span aria-hidden="true">
                        {item.kind === "learn" ? "📘" : item.kind === "revise" ? "🔁" : "🃏"}
                      </span>
                      <Link
                        href={link.href}
                        className={`min-w-0 flex-1 hover:underline ${item.done ? "text-muted line-through" : ""}`}
                      >
                        {link.label}
                      </Link>
                      <span className="shrink-0 text-xs text-muted">{item.minutes} min</span>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>

      {plan.overflow.length > 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-surface-2 p-4 text-sm">
          <p className="font-semibold">Didn&apos;t fit in this plan ({plan.overflow.length})</p>
          <p className="mt-1 text-muted">{plan.overflow.map(topicName).join(" · ")}</p>
          <p className="mt-1 text-muted">
            Add more time per day or more days, or make a new plan after this one.
          </p>
        </div>
      )}
    </div>
  );
}
