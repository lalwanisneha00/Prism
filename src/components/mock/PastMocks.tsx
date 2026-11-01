"use client";

import { useEffect, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { listMockResults } from "@/lib/mock/results";
import type { MockResult } from "@/lib/storage/db";

const dateText = (at: number) =>
  new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** Past mocks with score, scope and date; Review opens the marked paper, Retake writes a new one. */
export function PastMocks({
  version,
  canOpen,
  onReview,
  onRetake,
}: {
  /** Bumped after a new result is saved. */
  version: number;
  canOpen: (r: MockResult) => boolean;
  onReview: (r: MockResult) => void;
  onRetake: (r: MockResult) => void;
}) {
  const dataVersion = useDataVersion();
  const [list, setList] = useState<MockResult[] | null>(null);
  useEffect(() => {
    let alive = true;
    listMockResults()
      .then((r) => alive && setList(r))
      .catch(() => alive && setList([]));
    return () => {
      alive = false;
    };
  }, [dataVersion, version]);

  return (
    <section
      aria-labelledby="past-mocks-title"
      className="flex flex-col gap-3"
      data-testid="past-mocks"
    >
      <h2 id="past-mocks-title" className="text-xl font-bold">
        Past mocks
      </h2>
      {list === null ? (
        <div className="h-16 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" />
      ) : list.length === 0 ? (
        <p className="text-sm text-muted">No mocks yet. Your results will show here.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.slice(0, 20).map((r) => {
            const open = canOpen(r);
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{r.title}</span>
                  <span className="block text-xs text-muted">
                    {r.scope?.label ??
                      (r.chapter === "multiple" ? "Several chapters" : "One chapter")}{" "}
                    · {dateText(r.at)} · {r.minutes} min
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">
                    {r.score}/{r.total}
                  </span>
                  {open && r.paper && (
                    <button
                      type="button"
                      onClick={() => onReview(r)}
                      className="rounded-full border border-border px-3 py-1 font-semibold"
                    >
                      Review
                    </button>
                  )}
                  {open && (
                    <button
                      type="button"
                      onClick={() => onRetake(r)}
                      className="rounded-full border border-border px-3 py-1 font-semibold"
                    >
                      Retake
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
