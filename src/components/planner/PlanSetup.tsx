"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useTopicStatuses } from "@/components/map/useTopicStatuses";
import { durations } from "@/data/durations";
import { availableLevels } from "@/data/levels";
import { confusedTopics, listAllAnnotations } from "@/lib/annotations/store";
import { listCards } from "@/lib/flashcards/cards";
import { buildPlan } from "@/lib/planner/plan";
import { planId, savePlan } from "@/lib/planner/store";
import { localDate } from "@/lib/progress/tracker";
import type { StudyPlan } from "@/lib/storage/db";
import type { Subject } from "@/lib/subjects";

const field = "rounded-xl border border-border bg-bg px-3 py-2 text-sm";

/** Set up a backlog plan: topics, daily time, level, length and how many days. */
export function PlanSetup({
  subject,
  replacing,
  onCreated,
  onCancel,
}: {
  subject: Subject;
  replacing: boolean;
  onCreated: (plan: StudyPlan) => void;
  onCancel?: () => void;
}) {
  const id = useId();
  const statuses = useTopicStatuses();
  const [confused, setConfused] = useState<Set<string>>(new Set());
  const [hasCards, setHasCards] = useState(false);
  const [minutesPerDay, setMinutesPerDay] = useState(60);
  const [lessonMinutes, setLessonMinutes] = useState(15);
  const [level, setLevel] = useState("building-blocks");
  const [days, setDays] = useState(7);
  const [examDate, setExamDate] = useState("");
  // Topics the student DIDN'T pick; everything not yet mastered starts picked.
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  useEffect(() => {
    listAllAnnotations()
      .then((notes) => setConfused(new Set(confusedTopics(notes).map((c) => c.topic))))
      .catch(() => undefined);
    listCards()
      .then((cards) => setHasCards(cards.some((c) => c.subject === subject.id)))
      .catch(() => undefined);
  }, [subject.id]);

  const isWeak = (topicId: string) => statuses.get(topicId) === "weak" || confused.has(topicId);
  const picked = (topicId: string) =>
    statuses.get(topicId) !== "mastered" && !excluded.has(topicId);
  // Read the clock once, not on every render.
  const [today] = useState(() => localDate(Date.now()));
  const daysUntilExam = examDate
    ? Math.max(
        1,
        Math.round((new Date(examDate).getTime() - new Date(today).getTime()) / 86_400_000),
      )
    : null;
  const planDays = Math.min(60, daysUntilExam ?? days);
  const chosen = subject.chapters.flatMap((c) => c.topics.filter((t) => picked(t.id)));

  function toggle(topicId: string) {
    setExcluded((s) => {
      const next = new Set(s);
      if (statuses.get(topicId) === "mastered") return next; // mastered topics stay out
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const now = Date.now();
    const { days: planned, overflow } = buildPlan({
      topics: subject.chapters.flatMap((c) =>
        c.topics
          .filter((t) => picked(t.id))
          .map((t) => ({
            id: t.id,
            name: t.name,
            chapterId: c.id,
            requires: t.requires ?? [],
            weak: isWeak(t.id),
          })),
      ),
      startDate: today,
      days: planDays,
      minutesPerDay,
      lessonMinutes,
      flashcards: hasCards,
    });
    const plan = await savePlan({
      id: planId(subject.id),
      subject: subject.id,
      level,
      lessonMinutes,
      minutesPerDay,
      startDate: today,
      ...(examDate ? { examDate } : {}),
      days: planned,
      overflow: overflow.map((t) => t.id),
      createdAt: now,
      updatedAt: now,
      deleted: false,
    });
    onCreated(plan);
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-6"
    >
      <div>
        <h2 className="text-xl font-bold">{replacing ? "Make a new plan" : "Plan your backlog"}</h2>
        <p className="mt-1 text-sm text-muted">
          Prism orders topics so you always learn what a topic builds on first, puts weak topics
          early, and adds short revision 1 and 3 days after each lesson.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor={`${id}-min`}>
          Study time per day
          <select
            id={`${id}-min`}
            value={minutesPerDay}
            onChange={(e) => setMinutesPerDay(Number(e.target.value))}
            className={field}
          >
            {[20, 30, 45, 60, 90, 120, 180].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} minutes` : `${m / 60} hour${m === 60 ? "" : "s"}`}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor={`${id}-len`}>
          Length of each lesson
          <select
            id={`${id}-len`}
            value={lessonMinutes}
            onChange={(e) => setLessonMinutes(Number(e.target.value))}
            className={field}
          >
            {durations
              .filter((d) => d.minutes <= 60)
              .map((d) => (
                <option key={d.minutes} value={d.minutes}>
                  {d.label}
                </option>
              ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor={`${id}-lvl`}>
          Level
          <select
            id={`${id}-lvl`}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className={field}
          >
            {availableLevels.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1 text-sm font-semibold">
          <label htmlFor={`${id}-exam`}>Exam date (optional)</label>
          <input
            id={`${id}-exam`}
            type="date"
            min={today}
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className={field}
          />
          {!examDate && (
            <label className="mt-1 flex items-center gap-2 font-normal">
              Plan for
              <select
                aria-label="Number of days"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className={field}
              >
                {[3, 5, 7, 10, 14, 21, 30].map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold">
          Backlog topics ({chosen.length} picked){" "}
          <span className="font-normal text-muted">· mastered topics are left out; ⚠ = weak</span>
        </legend>
        {subject.chapters.map((c) => (
          <div key={c.id} className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">{c.name}</p>
            <div className="flex flex-wrap gap-1.5">
              {c.topics.map((t) => {
                const mastered = statuses.get(t.id) === "mastered";
                const on = picked(t.id);
                return (
                  <label
                    key={t.id}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${mastered ? "border-success/40 text-success opacity-70" : on ? "border-primary bg-primary-soft text-primary" : "border-border text-muted"}`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      disabled={mastered}
                      onChange={() => toggle(t.id)}
                    />
                    {mastered ? "✓ " : isWeak(t.id) ? "⚠ " : ""}
                    {t.name}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={chosen.length === 0}
          className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
        >
          Build my {planDays}-day plan
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-5 py-2.5 font-semibold hover:bg-surface-2"
          >
            Keep my current plan
          </button>
        )}
        {replacing && (
          <span className="text-sm text-muted">
            This replaces your current plan for {subject.name}.
          </span>
        )}
      </div>
    </form>
  );
}
