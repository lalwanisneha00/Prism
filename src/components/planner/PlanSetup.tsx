"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { PlanOverview } from "@/components/planner/PlanOverview";
import { SubjectPicker } from "@/components/planner/SubjectPicker";
import { TimeSettings, WEEK_PRESETS } from "@/components/planner/TimeSettings";
import { availableLevels } from "@/data/levels";
import { listCards } from "@/lib/flashcards/cards";
import { buildV2Plan } from "@/lib/planner/build";
import { savePlan } from "@/lib/planner/store";
import { RANGE_PRESETS, type RangePreset } from "@/lib/priority/config";
import type { Importance } from "@/lib/priority/importance";
import {
  EMPTY_MODEL,
  loadStudyModel,
  subjectImportance,
  topicKey,
  type StudyModel,
} from "@/lib/priority/model";
import { localDate } from "@/lib/progress/tracker";
import type { StudyPlan } from "@/lib/storage/db";
import { findSubject, subjects as allSubjects, type Subject } from "@/lib/subjects";

const field = "rounded-xl border border-border bg-bg px-3 py-2 text-sm";
const pill = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-2"}`;

/** Set up a plan: subjects, topics, time range, days and hours, then check it before saving. */
export function PlanSetup({
  replacing,
  initialSubjects,
  onCreated,
  onCancel,
}: {
  replacing: boolean;
  initialSubjects?: string[];
  onCreated: (plan: StudyPlan) => void;
  onCancel?: () => void;
}) {
  const id = useId();
  const [chosen, setChosen] = useState<string[]>(initialSubjects ?? []);
  const [model, setModel] = useState<StudyModel>(EMPTY_MODEL);
  const [modelReady, setModelReady] = useState(false);
  const [importance, setImportance] = useState<Map<string, Importance>>(new Map());
  const [hasCards, setHasCards] = useState(false);
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [preset, setPreset] = useState<RangePreset | "custom">("balanced");
  const [custom, setCustom] = useState({ min: 10, max: 30 });
  const [level, setLevel] = useState("building-blocks");
  const [days, setDays] = useState(7);
  const [examDate, setExamDate] = useState("");
  const [week, setWeek] = useState<number[]>([...WEEK_PRESETS.same.week]);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [flashcards, setFlashcards] = useState(true);
  const [finalReview, setFinalReview] = useState(true);
  const [today] = useState(() => localDate(Date.now()));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    loadStudyModel(allSubjects)
      .then(setModel)
      .catch(() => undefined)
      .finally(() => setModelReady(true));
    listCards()
      .then((c) => setHasCards(c.length > 0))
      .catch(() => undefined);
  }, []);

  const chosenSubjects = useMemo(
    () => chosen.map((s) => findSubject(s)).filter((s): s is Subject => Boolean(s)),
    [chosen],
  );
  useEffect(() => {
    let live = true;
    Promise.all(
      chosenSubjects.map(async (s) => [s, await subjectImportance(s, model.overrides)] as const),
    )
      .then((rows) => {
        if (!live) return;
        const map = new Map<string, Importance>();
        for (const [s, m] of rows) for (const [tid, imp] of m) map.set(topicKey(s.id, tid), imp);
        setImportance(map);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [chosenSubjects, model.overrides]);

  // Topics already done well start left out; the student can flip any topic.
  const picked = useMemo(() => {
    const set = new Set<string>();
    for (const s of chosenSubjects)
      for (const c of s.chapters)
        for (const t of c.topics) {
          const key = topicKey(s.id, t.id);
          if (!model.doneWell.has(key) !== flipped.has(key)) set.add(key);
        }
    return set;
  }, [chosenSubjects, model.doneWell, flipped]);

  const daysUntilExam = examDate
    ? Math.max(
        1,
        Math.round((new Date(examDate).getTime() - new Date(today).getTime()) / 86_400_000),
      )
    : null;
  const planDays = Math.min(90, daysUntilExam ?? days);
  const range = preset === "custom" ? custom : RANGE_PRESETS[preset];
  const lo = Math.min(range.min, range.max);
  const hi = Math.max(range.min, range.max);

  const plan = useMemo(
    () =>
      chosenSubjects.length === 0 || picked.size === 0
        ? null
        : buildV2Plan({
            subjects: chosenSubjects,
            picked,
            model,
            level,
            range: { min: lo, max: hi },
            weekMinutes: week,
            overrides,
            startDate: today,
            days: planDays,
            examDate: examDate || undefined,
            flashcards: flashcards && hasCards,
            finalReview,
            importance,
          }),
    [
      chosenSubjects,
      picked,
      model,
      level,
      lo,
      hi,
      week,
      overrides,
      today,
      planDays,
      examDate,
      flashcards,
      hasCards,
      finalReview,
      importance,
    ],
  );

  function toggle(key: string) {
    setFlipped((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function save() {
    if (!plan) return;
    setSaving(true);
    setSaveError(false);
    try {
      onCreated(await savePlan({ ...plan, id: `plan:${Date.now().toString(36)}` }));
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div>
        <h2 className="text-xl font-bold">{replacing ? "Make a new plan" : "Plan your backlog"}</h2>
        <p className="mt-1 text-sm text-muted">
          Prism puts high-return and weak topics first, never before what they build on, gives each
          topic time by how much it needs, and keeps breaks and a little spare time in every day.
        </p>
      </div>

      <SubjectPicker selected={chosen} onChange={setChosen} />

      {chosenSubjects.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold">
            Topics ({picked.size} picked){" "}
            <span className="font-normal text-muted">· topics you did well in are left out</span>
          </legend>
          {chosenSubjects.map((s) => (
            <details
              key={s.id}
              open={chosenSubjects.length === 1}
              className="rounded-xl border border-border p-3"
            >
              <summary className="cursor-pointer text-sm font-semibold">{s.name}</summary>
              {s.chapters.map((c) => (
                <div key={c.id} className="mt-2 flex flex-col gap-1.5">
                  <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                    {c.name}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {c.topics.map((t) => {
                      const key = topicKey(s.id, t.id);
                      const on = picked.has(key);
                      const done = model.doneWell.has(key);
                      const weak = model.weakness.get(key)?.weak;
                      return (
                        <label
                          key={key}
                          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${on ? "border-primary bg-primary-soft text-primary" : done ? "border-success/40 text-success opacity-70" : "border-border text-muted"}`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={on}
                            onChange={() => toggle(key)}
                          />
                          {done ? "Done well · " : weak ? "Weak · " : ""}
                          {t.name}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </details>
          ))}
        </fieldset>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">
          Time for each topic (lowest to highest priority)
        </legend>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(RANGE_PRESETS) as RangePreset[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={preset === k}
              onClick={() => setPreset(k)}
              className={pill(preset === k)}
            >
              {RANGE_PRESETS[k].label} {RANGE_PRESETS[k].min}–{RANGE_PRESETS[k].max} min
            </button>
          ))}
          <button
            type="button"
            aria-pressed={preset === "custom"}
            onClick={() => setPreset("custom")}
            className={pill(preset === "custom")}
          >
            Custom
          </button>
        </div>
        {preset === "custom" && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label>
              From{" "}
              <input
                type="number"
                min={5}
                max={120}
                step={5}
                value={custom.min}
                onChange={(e) => setCustom({ ...custom, min: Number(e.target.value) || 5 })}
                className={`${field} w-20`}
              />
            </label>
            <label>
              to{" "}
              <input
                type="number"
                min={5}
                max={120}
                step={5}
                value={custom.max}
                onChange={(e) => setCustom({ ...custom, max: Number(e.target.value) || 5 })}
                className={`${field} w-20`}
              />{" "}
              minutes
            </label>
          </div>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
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
                {[...new Set([3, 5, 7, 10, 12, 14, 21, 30, 45, 60, 90, days])]
                  .sort((a, b) => a - b)
                  .map((d) => (
                    <option key={d} value={d}>
                      {d} days
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <TimeSettings
        week={week}
        onWeek={setWeek}
        overrides={overrides}
        onOverrides={setOverrides}
        startDate={today}
      />

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={flashcards}
            disabled={!hasCards}
            onChange={(e) => setFlashcards(e.target.checked)}
            className="accent-primary"
          />
          Daily flashcards{!hasCards && " (make some first)"}
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={finalReview}
            onChange={(e) => setFinalReview(e.target.checked)}
            className="accent-primary"
          />
          Final revision and mock test on the last day
        </label>
      </div>

      {!modelReady && (
        <div className="h-24 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />
      )}
      {modelReady && !plan && (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
          Pick at least one subject with a topic to see your plan.
        </p>
      )}
      {modelReady && plan && (
        <PlanOverview
          plan={plan}
          onMoreDays={(n) => setDays(Math.min(90, planDays + n))}
          onMoreTime={(m) => setWeek(week.map((w) => (w > 0 ? Math.min(480, w + m) : w)))}
          examLocked={Boolean(examDate)}
          onAddRevision={() => setFinalReview(true)}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!plan || saving}
          className="rounded-full bg-primary px-6 py-3 font-semibold text-primary-fg hover:bg-primary-hover disabled:opacity-60"
        >
          {saving ? "Saving…" : `Save my ${planDays}-day plan`}
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
        {saveError && (
          <span role="alert" className="text-sm text-danger">
            This browser is blocking storage, so the plan couldn&apos;t be saved.
          </span>
        )}
      </div>
    </div>
  );
}
