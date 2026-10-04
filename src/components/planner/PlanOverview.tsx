"use client";

import { PLANNER } from "@/lib/priority/config";
import type { StudyPlan } from "@/lib/storage/db";
import { findSubject } from "@/lib/subjects";

type Props = {
  plan: StudyPlan;
  onMoreDays: (n: number) => void;
  onMoreTime: (minutesPerDay: number) => void;
  examLocked: boolean;
  onAddRevision: () => void;
};

const hours = (m: number) => `${Math.round((m / 60) * 10) / 10} h`;

/** What the plan holds, what didn't fit (with ways to fix it) and any spare time. */
export function PlanOverview({ plan, onMoreDays, onMoreTime, examLocked, onAddRevision }: Props) {
  const items = plan.days.flatMap((d) => d.items);
  const study = items.reduce((s, i) => s + i.minutes, 0);
  const breaks = plan.days.reduce(
    (s, d) => s + (d.sessions ?? []).reduce((x, y) => x + y.breakAfter, 0),
    0,
  );
  const bySubject = new Map<string, number>();
  for (const i of items)
    if (i.subject) bySubject.set(i.subject, (bySubject.get(i.subject) ?? 0) + i.minutes);
  const capacity = plan.days.reduce((s, d) => s + (d.available ?? 0), 0);
  const spare = Math.max(0, Math.round(capacity * 0.9) - study - breaks);
  const hasFinal = items.some((i) => i.kind === "mock-test");
  const overflow = plan.overflow.length;
  const overflowMinutes = Math.max(30, overflow * 15);
  const perDay = Math.max(5, Math.ceil(overflowMinutes / Math.max(1, plan.days.length) / 5) * 5);
  const extraDays = Math.max(
    1,
    Math.ceil(overflowMinutes / Math.max(1, capacity / Math.max(1, plan.days.length))),
  );
  const button = "rounded-full border border-border px-3 py-1.5 font-semibold hover:bg-surface-2";

  return (
    <section
      aria-label="Plan overview"
      className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-4 text-sm"
    >
      <p className="font-semibold">
        {plan.days.length} days · {hours(study)} of study · {hours(breaks)} of breaks
      </p>
      {bySubject.size > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-muted">
          {[...bySubject].map(([sid, m]) => (
            <li key={sid}>
              {findSubject(sid)?.name ?? sid}: {hours(m)}
            </li>
          ))}
        </ul>
      )}
      {overflow > 0 && (
        <div role="status" className="rounded-xl border border-warning/50 bg-warning/10 p-3">
          <p className="font-semibold">
            {overflow} topic{overflow === 1 ? "" : "s"} didn&apos;t fit (the lowest-return ones were
            left out).
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {!examLocked && (
              <button type="button" onClick={() => onMoreDays(extraDays)} className={button}>
                Add {extraDays} day{extraDays === 1 ? "" : "s"}
              </button>
            )}
            <button type="button" onClick={() => onMoreTime(perDay)} className={button}>
              Add {perDay} min on study days
            </button>
          </div>
          <p className="mt-2 text-muted">Or leave them out: they are listed in the plan.</p>
        </div>
      )}
      {overflow === 0 && spare >= PLANNER.spareOfferMinutes && (
        <div role="status" className="rounded-xl border border-border p-3">
          <p>
            About {hours(spare)} of spare time is left over.{" "}
            {hasFinal
              ? "Use it for extra revision, or finish earlier."
              : "Add a final revision and mock test to use it."}
          </p>
          {!hasFinal && plan.days.length >= PLANNER.finalRevisionMinDays && (
            <button type="button" onClick={onAddRevision} className={`mt-2 ${button}`}>
              Add revision and mock test
            </button>
          )}
        </div>
      )}
    </section>
  );
}
