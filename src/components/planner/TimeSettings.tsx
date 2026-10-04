"use client";

import { useId, useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = [0, 30, 60, 90, 120, 180, 240, 300, 360, 480];

export const WEEK_PRESETS: Record<string, { label: string; week: number[] }> = {
  same: { label: "Same every day (1 h)", week: [60, 60, 60, 60, 60, 60, 60] },
  college: {
    label: "College days (2 h evenings, 6 h weekends)",
    week: [360, 120, 120, 120, 120, 120, 360],
  },
  sunday: { label: "Sunday off, 2 h otherwise", week: [0, 120, 120, 120, 120, 120, 120] },
  weekendOff: { label: "Weekends off, 2 h on weekdays", week: [0, 120, 120, 120, 120, 120, 0] },
};

const label = (m: number) => (m === 0 ? "Day off" : m < 60 ? `${m} min` : `${m / 60} h`);

/** Study minutes per weekday, quick presets, and one-off changes for particular dates. */
export function TimeSettings({
  week,
  onWeek,
  overrides,
  onOverrides,
  startDate,
}: {
  week: number[];
  onWeek: (w: number[]) => void;
  overrides: Record<string, number>;
  onOverrides: (o: Record<string, number>) => void;
  startDate: string;
}) {
  const id = useId();
  const [date, setDate] = useState("");
  const [minutes, setMinutes] = useState(0);
  const field = "rounded-xl border border-border bg-bg px-2 py-2 text-sm";
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold">Study time on each weekday</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(WEEK_PRESETS).map(([key, p]) => (
          <button
            key={key}
            type="button"
            onClick={() => onWeek([...p.week])}
            className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-surface-2"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {DAYS.map((d, i) => (
          <label key={d} className="flex flex-col gap-1 text-xs font-semibold">
            {d}
            <select
              value={week[i]}
              onChange={(e) => onWeek(week.map((w, k) => (k === i ? Number(e.target.value) : w)))}
              className={field}
            >
              {[...new Set([...HOURS, week[i]])]
                .sort((a, b) => a - b)
                .map((m) => (
                  <option key={m} value={m}>
                    {label(m)}
                  </option>
                ))}
            </select>
          </label>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">Change one date (exam, trip, holiday)</p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs font-semibold" htmlFor={`${id}-d`}>
            Date
            <input
              id={`${id}-d`}
              type="date"
              min={startDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={field}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold">
            Time
            <select
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className={field}
            >
              {HOURS.map((m) => (
                <option key={m} value={m}>
                  {label(m)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!date}
            onClick={() => {
              onOverrides({ ...overrides, [date]: minutes });
              setDate("");
            }}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2 disabled:opacity-60"
          >
            Set date
          </button>
        </div>
        {Object.keys(overrides).length > 0 && (
          <ul className="flex flex-wrap gap-2 text-xs">
            {Object.entries(overrides)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([d, m]) => (
                <li key={d}>
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...overrides };
                      delete next[d];
                      onOverrides(next);
                    }}
                    aria-label={`Remove change for ${d}`}
                    className="rounded-full border border-border px-3 py-1"
                  >
                    {d}: {label(m)} ×
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </fieldset>
  );
}
