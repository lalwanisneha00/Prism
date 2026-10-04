"use client";

import Link from "next/link";
import { useState } from "react";
import { buildV2Plan } from "@/lib/planner/build";
import { addDays, planProgress } from "@/lib/planner/plan";
import { savePlan, setItemDone } from "@/lib/planner/store";
import { upgradePlan } from "@/lib/planner/upgrade";
import { nearestDuration } from "@/lib/priority/length";
import { loadStudyModel } from "@/lib/priority/model";
import { TAG_LABEL, type PriorityTag } from "@/lib/priority/priority";
import { localDate } from "@/lib/progress/tracker";
import type { StudyPlan } from "@/lib/storage/db";
import { findChapter, findSubject, findTopic, subjects } from "@/lib/subjects";

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

const KIND_LABEL: Record<Item["kind"], string> = {
  learn: "Learn",
  revise: "Revise",
  flashcards: "Flashcards",
  "final-revision": "Final revision",
  "mock-test": "Mock test",
};

/** Where an item's link goes, and what it is called. Learn items open at the plan's level and length. */
export function itemLink(plan: StudyPlan, item: Item): { href: string; label: string } {
  if (item.kind === "flashcards") return { href: "/flashcards", label: "Review due flashcards" };
  if (item.kind === "mock-test") return { href: "/mock-test", label: "Mock test" };
  if (item.kind === "final-revision")
    return { href: "/flashcards", label: "Final revision: weak topics and flashcards" };
  const subject = findSubject(item.subject ?? plan.subject);
  const chapter = subject?.chapters.find((c) => c.topics.some((t) => t.id === item.topicId));
  const topic = chapter && findTopic(chapter, item.topicId ?? "");
  if (!subject || !chapter || !topic) return { href: "/", label: item.topicId ?? "" };
  const revise = item.kind === "revise";
  const params = new URLSearchParams({
    subject: subject.id,
    chapter: findChapter(subject, chapter.id)!.id,
    topic: topic.id,
    level: revise ? "last-minute" : plan.level,
    duration: String(revise ? 5 : nearestDuration(item.minutes)),
  });
  return { href: `/lesson?${params}`, label: revise ? `Revise: ${topic.name}` : topic.name };
}

function topicLabel(key: string): string {
  const [sid, ...rest] = key.split("/");
  const tid = rest.join("/");
  const subject = findSubject(sid);
  const name = subject?.chapters.flatMap((c) => c.topics).find((t) => t.id === tid)?.name ?? tid;
  return subjects.length > 1 && subject ? `${name} (${subject.name})` : name;
}

/** The plan, day by day, with tick boxes (each tick syncs), sessions and breaks. */
export function PlanDays({
  plan: stored,
  onChange,
  onReplan,
  onDelete,
}: {
  plan: StudyPlan;
  onChange: (plan: StudyPlan) => void;
  onReplan: () => void;
  onDelete: () => void;
}) {
  const plan = upgradePlan(stored);
  const [today] = useState(() => localDate(Date.now()));
  const [busy, setBusy] = useState(false);
  const progress = planProgress(plan.days);
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  const lateItems = plan.days
    .filter((d) => d.date < today)
    .flatMap((d) => d.items.filter((i) => !i.done));

  async function toggle(item: Item) {
    onChange(await setItemDone(plan, item.id, !item.done));
  }

  /** Re-plans what is still undone from today, keeping the same settings. */
  async function rebalance() {
    setBusy(true);
    try {
      const undone = new Set<string>();
      for (const d of plan.days)
        for (const i of d.items)
          if (i.kind === "learn" && !i.done && i.topicId)
            undone.add(`${i.subject ?? plan.subject}/${i.topicId}`);
      for (const o of plan.overflow) undone.add(o);
      const subs = (plan.subjects ?? [plan.subject])
        .map((s) => findSubject(s))
        .filter((s): s is NonNullable<typeof s> => Boolean(s));
      const model = await loadStudyModel(subjects);
      const left = plan.examDate
        ? Math.max(
            1,
            Math.round(
              (new Date(plan.examDate).getTime() - new Date(today).getTime()) / 86_400_000,
            ),
          )
        : Math.max(1, plan.days.filter((d) => d.date >= today).length);
      const next = buildV2Plan({
        subjects: subs,
        picked: undone,
        model,
        level: plan.level,
        range: plan.range ?? { min: 10, max: 30 },
        weekMinutes: plan.weekMinutes ?? Array.from({ length: 7 }, () => plan.minutesPerDay),
        overrides: plan.overrides,
        startDate: today,
        days: left,
        examDate: plan.examDate,
        flashcards: plan.flashcards ?? false,
        finalReview: plan.finalReview ?? false,
        breaks: plan.breaks,
      });
      onChange(await savePlan({ ...next, id: plan.id, createdAt: plan.createdAt }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">
            {plan.title ??
              (plan.subjects ?? [plan.subject]).map((s) => findSubject(s)?.name ?? s).join(", ")}
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
        <p className="text-sm text-muted">
          {progress.done} of {progress.total} done ·{" "}
          {Math.round((progress.minutesDone / 60) * 10) / 10} h studied
        </p>
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
          <div className="flex flex-wrap items-center gap-3 text-sm text-warning">
            <p>
              {lateItems.length} item{lateItems.length === 1 ? "" : "s"} from earlier days not done
              yet: no stress.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void rebalance()}
              className="rounded-full border border-border px-3 py-1.5 font-semibold text-fg hover:bg-surface-2 disabled:opacity-60"
            >
              {busy ? "Re-planning…" : "Re-plan what's left from today"}
            </button>
          </div>
        )}
      </div>

      <ol className="flex flex-col gap-3">
        {plan.days.map((day) => {
          const minutes = day.items.reduce((s, i) => s + i.minutes, 0);
          const isToday = day.date === today;
          const sessions = day.sessions?.length
            ? day.sessions
            : [{ itemIds: day.items.map((i) => i.id), breakAfter: 0 }];
          return (
            <li
              key={day.date}
              className={`rounded-2xl border bg-surface p-4 ${isToday ? "border-primary" : "border-border"} ${day.date < today ? "opacity-75" : ""}`}
            >
              <p className="flex items-baseline justify-between gap-2">
                <span className={`font-semibold ${isToday ? "text-primary" : ""}`}>
                  {dayLabel(day.date, today)}
                </span>
                <span className="text-xs text-muted">
                  {day.items.length === 0 ? "Day off" : `${minutes} min`}
                </span>
              </p>
              {sessions.map((s, si) => (
                <div key={si} className="mt-2">
                  {sessions.length > 1 && (
                    <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                      Session {si + 1}
                    </p>
                  )}
                  <ul className="mt-1 flex flex-col gap-1.5">
                    {s.itemIds
                      .map((iid) => day.items.find((i) => i.id === iid))
                      .filter((i): i is Item => Boolean(i))
                      .map((item) => {
                        const link = itemLink(plan, item);
                        return (
                          <li key={item.id} className="flex items-center gap-3 text-sm">
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={() => void toggle(item)}
                              aria-label={`Done: ${link.label}`}
                              className="size-4 shrink-0 accent-primary"
                            />
                            <span className="w-20 shrink-0 text-xs text-muted">
                              {KIND_LABEL[item.kind]}
                            </span>
                            <span className="min-w-0 flex-1">
                              <Link
                                href={link.href}
                                className={`hover:underline ${item.done ? "text-muted line-through" : ""}`}
                              >
                                {link.label}
                              </Link>
                              {item.tags && item.tags.length > 0 && (
                                <span className="ml-2 text-xs text-muted">
                                  {item.tags
                                    .map((t) => TAG_LABEL[t as PriorityTag] ?? t)
                                    .join(" · ")}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-xs text-muted">{item.minutes} min</span>
                          </li>
                        );
                      })}
                  </ul>
                  {s.breakAfter > 0 && (
                    <p className="mt-1.5 text-xs text-muted">Break: {s.breakAfter} min</p>
                  )}
                </div>
              ))}
            </li>
          );
        })}
      </ol>

      {plan.overflow.length > 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-surface-2 p-4 text-sm">
          <p className="font-semibold">Didn&apos;t fit in this plan ({plan.overflow.length})</p>
          <p className="mt-1 text-muted">{plan.overflow.map(topicLabel).join(" · ")}</p>
          <p className="mt-1 text-muted">
            Add more time per day or more days, or make a new plan after this one.
          </p>
        </div>
      )}
    </div>
  );
}
