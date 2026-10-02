"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { useTopicStatuses } from "@/components/map/useTopicStatuses";
import { itemLink } from "@/components/planner/PlanDays";
import { activityDays, listPlans, setItemDone } from "@/lib/planner/store";
import { chapterProgress, localDate, streak } from "@/lib/progress/tracker";
import type { StudyPlan } from "@/lib/storage/db";
import { subjects } from "@/lib/subjects";

/** 🔥 streak + today's plan items, at the top of the dashboard. */
export function TodayAndStreak() {
  const dataVersion = useDataVersion();
  const [today] = useState(() => localDate(Date.now()));
  const [days, setDays] = useState<Set<string> | null>(null);
  const [plans, setPlans] = useState<StudyPlan[]>([]);

  useEffect(() => {
    activityDays()
      .then(setDays)
      .catch(() => setDays(new Set()));
    listPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, [dataVersion]);

  if (!days)
    return <div className="h-24 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />;
  const s = streak(days, today);
  const todays = plans.flatMap((plan) =>
    (plan.days.find((d) => d.date === today)?.items ?? []).map((item) => ({ plan, item })),
  );

  async function toggle(plan: StudyPlan, itemId: string, done: boolean) {
    const next = await setItemDone(plan, itemId, done);
    setPlans((ps) => ps.map((p) => (p.id === next.id ? next : p)));
    setDays((d) => new Set([...(d ?? []), today]));
  }

  return (
    <div className="grid gap-4 md:grid-cols-[auto_1fr]">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5">
        <span className="text-4xl" aria-hidden="true">
          {s.days > 0 ? "🔥" : "🌱"}
        </span>
        <div>
          <p className="text-2xl font-bold">
            {s.days} day{s.days === 1 ? "" : "s"}
          </p>
          <p className="text-sm text-muted">
            {s.days === 0
              ? "Study today to start a streak."
              : s.studiedToday
                ? "Study streak: you've studied today ✓"
                : "Study today to keep your streak!"}
          </p>
        </div>
      </div>
      <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">Today&apos;s plan</h2>
          <Link href="/planner" className="text-sm font-semibold text-primary underline">
            {plans.length ? "Open planner" : "Make a plan"}
          </Link>
        </div>
        {todays.length === 0 ? (
          <p className="text-sm text-muted">
            {plans.length
              ? "Nothing planned for today. 🎉"
              : "Behind on a subject? The backlog planner turns it into a day-by-day plan."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {todays.map(({ plan, item }) => {
              const subject = subjects.find((x) => x.id === plan.subject);
              if (!subject) return null;
              const link = itemLink(plan, subject, item);
              return (
                <li key={`${plan.id}-${item.id}`} className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => void toggle(plan, item.id, !item.done)}
                    aria-label={`Done: ${link.label}`}
                    className="size-4 accent-primary"
                  />
                  <Link
                    href={link.href}
                    className={`flex-1 hover:underline ${item.done ? "text-muted line-through" : ""}`}
                  >
                    {link.label}
                  </Link>
                  <span className="text-xs text-muted">{item.minutes} min</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/** How far each chapter has come, per subject (from the latest quiz and worksheet scores). */
export function ChapterProgressBars() {
  const statuses = useTopicStatuses();
  const used = subjects.filter((s) =>
    s.chapters.some((c) => c.topics.some((t) => statuses.has(t.id))),
  );
  if (used.length === 0) {
    return (
      <p className="text-sm text-muted">
        Finish a lesson quiz and your chapter progress appears here.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {used.map((subject) => (
        <div key={subject.id} className="flex flex-col gap-2">
          <p className="font-semibold">{subject.name}</p>
          <ul className="flex flex-col gap-2">
            {chapterProgress(subject, statuses).map((c) => (
              <li
                key={c.id}
                className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm"
              >
                <span className="truncate">{c.name}</span>
                <span
                  className="flex h-2.5 overflow-hidden rounded-full bg-surface-2"
                  role="img"
                  aria-label={`${c.name}: ${c.mastered} mastered, ${c.tried} tried, ${c.weak} weak of ${c.total}`}
                >
                  <span
                    className="bg-success"
                    style={{ width: `${(c.mastered / c.total) * 100}%` }}
                  />
                  <span className="bg-warning" style={{ width: `${(c.tried / c.total) * 100}%` }} />
                  <span className="bg-danger" style={{ width: `${(c.weak / c.total) * 100}%` }} />
                </span>
                <span className="text-xs text-muted">
                  {c.mastered}/{c.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="flex flex-wrap gap-x-3 text-xs text-muted">
        <span>🟩 mastered (≥ 80%)</span>
        <span>🟨 tried</span>
        <span>🟥 weak (&lt; 60%)</span>
      </p>
    </div>
  );
}
