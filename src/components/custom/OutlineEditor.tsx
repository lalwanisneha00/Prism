"use client";

import type { DraftChapter } from "@/lib/custom/syllabusText";

const small =
  "rounded-full border border-border px-2 py-0.5 text-xs font-semibold hover:bg-surface-2 disabled:opacity-40";
const input = "min-w-0 flex-1 rounded-lg border border-border bg-bg px-2 py-1 text-sm";

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Edit an outline of units and topics: rename, reorder, merge a unit into the one above,
 * delete, or add. Used for typed, pasted and material-built outlines alike.
 */
export function OutlineEditor({
  value,
  onChange,
  label,
}: {
  value: DraftChapter[];
  onChange: (next: DraftChapter[]) => void;
  label?: string;
}) {
  const setUnit = (i: number, unit: DraftChapter) =>
    onChange(value.map((u, k) => (k === i ? unit : u)));

  return (
    <div className="flex flex-col gap-3" data-testid="outline-editor">
      {label && (
        <p className="w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          {label}
        </p>
      )}
      {value.map((unit, i) => (
        <fieldset key={i} className="flex flex-col gap-2 rounded-xl border border-border p-3">
          <legend className="sr-only">Unit {i + 1}</legend>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-muted">Unit {i + 1}</span>
            <input
              aria-label={`Name of unit ${i + 1}`}
              value={unit.name}
              onChange={(e) => setUnit(i, { ...unit, name: e.target.value })}
              className={`${input} font-semibold`}
            />
            <button
              type="button"
              className={small}
              disabled={i === 0}
              onClick={() => onChange(move(value, i, i - 1))}
              aria-label={`Move unit ${i + 1} up`}
            >
              ↑
            </button>
            <button
              type="button"
              className={small}
              disabled={i === value.length - 1}
              onClick={() => onChange(move(value, i, i + 1))}
              aria-label={`Move unit ${i + 1} down`}
            >
              ↓
            </button>
            <button
              type="button"
              className={small}
              disabled={i === 0}
              onClick={() => {
                const above = value[i - 1];
                const merged = {
                  ...above,
                  topics: [...new Set([...above.topics, ...unit.topics])],
                };
                onChange(value.flatMap((u, k) => (k === i - 1 ? [merged] : k === i ? [] : [u])));
              }}
            >
              Merge into unit {i}
            </button>
            <button
              type="button"
              className={small}
              onClick={() => onChange(value.filter((_, k) => k !== i))}
            >
              Delete unit
            </button>
          </div>
          <ol className="flex flex-col gap-1 pl-4">
            {unit.topics.map((t, k) => (
              <li key={k} className="flex items-center gap-2">
                <input
                  aria-label={`Topic ${k + 1} of unit ${i + 1}`}
                  value={t}
                  onChange={(e) =>
                    setUnit(i, {
                      ...unit,
                      topics: unit.topics.map((x, j) => (j === k ? e.target.value : x)),
                    })
                  }
                  className={input}
                />
                <button
                  type="button"
                  className={small}
                  disabled={k === 0}
                  onClick={() => setUnit(i, { ...unit, topics: move(unit.topics, k, k - 1) })}
                  aria-label={`Move topic ${k + 1} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={small}
                  onClick={() =>
                    setUnit(i, { ...unit, topics: unit.topics.filter((_, j) => j !== k) })
                  }
                  aria-label={`Delete topic ${k + 1}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className={`${small} w-fit`}
            onClick={() => setUnit(i, { ...unit, topics: [...unit.topics, "New topic"] })}
          >
            + Add a topic
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className={`${small} w-fit`}
        onClick={() =>
          onChange([...value, { name: `Unit ${value.length + 1}`, topics: ["New topic"] }])
        }
      >
        + Add a unit
      </button>
    </div>
  );
}
