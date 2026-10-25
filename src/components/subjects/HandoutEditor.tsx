"use client";

import { useId, useState } from "react";
import type { StudentHandout } from "@/lib/syllabusFix/studentHandout";

const field = "rounded-xl border border-border bg-bg px-3 py-2 text-sm";
const btn = "rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-2";

const lines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

type Draft = { name: string; topics: string };

/** What the student sees: the units with their topics (or a lab's experiments). */
export function HandoutPreview({ handout }: { handout: StudentHandout }) {
  if (handout.courseType === "practical")
    return (
      <ol className="flex list-decimal flex-col gap-1 pl-5" data-testid="handout-preview">
        {handout.experiments.map((e) => (
          <li key={e.number}>{e.title}</li>
        ))}
      </ol>
    );
  return (
    <ol className="flex flex-col gap-3" data-testid="handout-preview">
      {handout.units.map((u, i) => (
        <li key={`${u.order}-${i}`} className="flex flex-col gap-1">
          <p className="font-semibold">
            Unit {i + 1}: {u.name}
          </p>
          <p className="text-muted">
            {u.topics.length ? u.topics.join(" · ") : "No topics found in this unit."}
          </p>
        </li>
      ))}
    </ol>
  );
}

/**
 * Fix what the reader got wrong: unit names, topics (one per line), add or remove units. A lab's
 * experiments are one per line. Saving returns a cleaned handout.
 */
export function HandoutEditor({
  handout,
  onSave,
  onCancel,
}: {
  handout: StudentHandout;
  onSave: (next: StudentHandout) => void;
  onCancel: () => void;
}) {
  const id = useId();
  const lab = handout.courseType === "practical";
  const [units, setUnits] = useState<Draft[]>(
    handout.units.map((u) => ({ name: u.name, topics: u.topics.join("\n") })),
  );
  const [experiments, setExperiments] = useState(
    handout.experiments.map((e) => e.title).join("\n"),
  );

  function save() {
    const kept = units
      .map((u) => ({ name: u.name.trim(), topics: lines(u.topics).slice(0, 80) }))
      .filter((u) => u.name || u.topics.length);
    onSave({
      ...handout,
      units: kept.slice(0, 20).map((u, i) => ({
        order: i + 1,
        name: u.name.slice(0, 300) || `Unit ${i + 1}`,
        topics: u.topics.map((t) => t.slice(0, 300)),
      })),
      experiments: lines(experiments)
        .slice(0, 60)
        .map((title, i) => ({ number: i + 1, title: title.slice(0, 300) })),
    });
  }

  return (
    <div className="flex flex-col gap-4" data-testid="handout-editor">
      {lab ? (
        <label className="flex flex-col gap-1" htmlFor={`${id}-exp`}>
          <span className="font-semibold">Experiments (one per line)</span>
          <textarea
            id={`${id}-exp`}
            rows={10}
            className={field}
            value={experiments}
            onChange={(e) => setExperiments(e.target.value)}
          />
        </label>
      ) : (
        units.map((u, i) => (
          <fieldset key={i} className="flex flex-col gap-2 rounded-xl border border-border p-3">
            <legend className="px-1 font-semibold">Unit {i + 1}</legend>
            <label className="flex flex-col gap-1" htmlFor={`${id}-n${i}`}>
              <span>Name</span>
              <input
                id={`${id}-n${i}`}
                className={field}
                value={u.name}
                onChange={(e) =>
                  setUnits(units.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))
                }
              />
            </label>
            <label className="flex flex-col gap-1" htmlFor={`${id}-t${i}`}>
              <span>Topics (one per line)</span>
              <textarea
                id={`${id}-t${i}`}
                rows={5}
                className={field}
                value={u.topics}
                onChange={(e) =>
                  setUnits(units.map((x, k) => (k === i ? { ...x, topics: e.target.value } : x)))
                }
              />
            </label>
            <button
              type="button"
              className={`${btn} w-fit`}
              onClick={() => setUnits(units.filter((_, k) => k !== i))}
            >
              Remove this unit
            </button>
          </fieldset>
        ))
      )}
      <div className="flex flex-wrap gap-2">
        {!lab && units.length < 20 && (
          <button
            type="button"
            className={btn}
            onClick={() => setUnits([...units, { name: "", topics: "" }])}
          >
            Add a unit
          </button>
        )}
        <button
          type="button"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
          onClick={save}
        >
          Done editing
        </button>
        <button type="button" className={btn} onClick={onCancel}>
          Discard edits
        </button>
      </div>
    </div>
  );
}
