"use client";

import Link from "next/link";
import { useState } from "react";
import { topicsInScope, type ScopeLevel, type ScopeTree } from "@/lib/mock/scope";

const levelLabel: Record<ScopeLevel, { name: string; hint: string }> = {
  subject: { name: "Whole subject", hint: "Every unit" },
  units: { name: "Units / chapters", hint: "Pick one or more units" },
  topics: { name: "Topics", hint: "Pick the topics you want" },
};

/** Step 2 and 3: how much to test, then what (a unit › topic tree with checkboxes). */
export function ScopeStep({
  part,
  tree,
  level,
  picked,
  studied,
  subjectId,
  onLevel,
  onPicked,
}: {
  /** Step 2 (how much) or step 3 (pick inside it). */
  part: "level" | "pick";
  tree: ScopeTree;
  level: ScopeLevel;
  picked: string[];
  studied: ReadonlySet<string> | null;
  subjectId: string;
  onLevel: (l: ScopeLevel) => void;
  onPicked: (ids: string[]) => void;
}) {
  const chosen = topicsInScope(tree, level, picked);
  const notStudied = studied ? chosen.filter((t) => !studied.has(t.id)) : [];
  return (
    <div className="flex flex-col gap-4">
      {part === "level" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">How much should the test cover?</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Scope">
            {(Object.keys(levelLabel) as ScopeLevel[]).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={level === l}
                onClick={() => onLevel(l)}
                className={`rounded-xl border p-3 text-left ${level === l ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2"}`}
              >
                <span className="block font-semibold">{levelLabel[l].name}</span>
                <span className="block text-xs text-muted">{levelLabel[l].hint}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            In your syllabus each unit is one chapter, so units and chapters are the same list.
          </p>
        </fieldset>
      )}

      {part === "pick" && level !== "subject" && (
        <ScopeTreePicker tree={tree} level={level} picked={picked} onPicked={onPicked} />
      )}

      {chosen.length > 0 && (part === "pick" || level === "subject") && (
        <p className="text-sm" data-testid="scope-summary">
          <strong>{chosen.length}</strong> {chosen.length === 1 ? "topic" : "topics"} in the test.
        </p>
      )}
      {notStudied.length > 0 && (part === "pick" || level === "subject") && (
        <p
          className="rounded-xl border border-border bg-surface-2 p-3 text-sm"
          data-testid="not-studied"
        >
          You haven&apos;t studied{" "}
          {notStudied.length <= 3
            ? notStudied.map((t) => t.name).join(", ")
            : `${notStudied.length} of these topics`}{" "}
          yet. Want a lesson first?{" "}
          <Link
            href={`/start?${new URLSearchParams({ subject: subjectId, chapter: notStudied[0].unitId, topic: notStudied[0].id })}`}
            className="font-semibold text-primary underline"
          >
            Start a lesson
          </Link>{" "}
          <span className="text-muted">(or take the test anyway).</span>
        </p>
      )}
    </div>
  );
}

function ScopeTreePicker({
  tree,
  level,
  picked,
  onPicked,
}: {
  tree: ScopeTree;
  level: "units" | "topics";
  picked: string[];
  onPicked: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(tree.units.slice(0, 1).map((u) => u.id)),
  );
  const set = new Set(picked);
  const toggle = (ids: readonly string[], on: boolean) => {
    const next = new Set(picked);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    onPicked([...next]);
  };
  const allIds =
    level === "units"
      ? tree.units.map((u) => u.id)
      : tree.units.flatMap((u) => u.topics.map((t) => t.id));
  const allOn = allIds.every((id) => set.has(id));
  return (
    <fieldset className="flex flex-col gap-2" data-testid="scope-tree">
      <legend className="mb-2 font-semibold">
        {level === "units" ? "Pick the units" : "Pick the topics"}
      </legend>
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={allOn} onChange={(e) => toggle(allIds, e.target.checked)} />
        Select all
      </label>
      <ul className="flex flex-col gap-2">
        {tree.units.map((u) => {
          const ids = u.topics.map((t) => t.id);
          const unitOn = level === "units" ? set.has(u.id) : ids.every((id) => set.has(id));
          const some = level === "topics" && !unitOn && ids.some((id) => set.has(id));
          const expanded = open.has(u.id);
          return (
            <li key={u.id} className="rounded-xl border border-border">
              <div className="flex items-start gap-2 p-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  aria-label={`Unit ${u.number}: ${u.name}${level === "topics" ? " (select all)" : ""}`}
                  checked={unitOn}
                  ref={(el) => {
                    if (el) el.indeterminate = some;
                  }}
                  onChange={(e) => toggle(level === "units" ? [u.id] : ids, e.target.checked)}
                />
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() =>
                    setOpen((s) => {
                      const n = new Set(s);
                      if (n.has(u.id)) n.delete(u.id);
                      else n.add(u.id);
                      return n;
                    })
                  }
                  className="flex min-w-0 flex-1 items-start justify-between gap-2 text-left"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      Unit {u.number}: {u.name}
                    </span>
                    <span className="block text-xs text-muted">{u.topics.length} topics</span>
                  </span>
                  <span aria-hidden className="text-muted">
                    {expanded ? "▴" : "▾"}
                  </span>
                </button>
              </div>
              {expanded && (
                <ul className="flex flex-col gap-1 border-t border-border p-3 pl-9">
                  {u.topics.map((t) =>
                    level === "topics" ? (
                      <li key={t.id}>
                        <label className="flex items-start gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={set.has(t.id)}
                            onChange={(e) => toggle([t.id], e.target.checked)}
                          />
                          <span>{t.name}</span>
                        </label>
                      </li>
                    ) : (
                      <li key={t.id} className="text-sm text-muted">
                        {t.name}
                      </li>
                    ),
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
