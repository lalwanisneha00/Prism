"use client";

import { Children, useEffect, useState, type ReactNode } from "react";
import { LessonHeader } from "@/components/lesson/LessonHeader";
import type { LessonRequest } from "@/lib/lessonRequest";

const funMessages = [
  "Sharpening the chalk…",
  "Untangling field lines…",
  "Asking the textbook for a second opinion…",
  "Checking the units twice…",
  "Drawing a better analogy than your professor…",
  "Counting significant figures…",
  "Making the maths look nice…",
];

/** Loading state: what's happening, a light-hearted message, and sections as they arrive. */
export function LessonSkeleton({
  request,
  stage,
  children,
}: {
  request: LessonRequest;
  stage: string;
  children: ReactNode;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2600);
    return () => clearInterval(id);
  }, []);
  const arrived = Children.count(children);

  return (
    <div className="flex flex-col gap-8" aria-busy="true">
      <LessonHeader request={request} />

      <div
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
      >
        <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <div>
          <p className="font-semibold">{stage}</p>
          <p className="text-sm text-muted">{funMessages[tick % funMessages.length]}</p>
        </div>
      </div>

      {arrived > 0 && (
        <div className="flex flex-col gap-5">
          <p className="text-sm font-semibold text-muted">Draft sections (still being checked):</p>
          {children}
        </div>
      )}

      <div className="flex flex-col gap-5" aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface p-6">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
            <div className="mt-3 h-6 w-2/3 animate-pulse rounded bg-surface-2" />
            <div className="mt-5 flex flex-col gap-2">
              <div className="h-3 w-full animate-pulse rounded bg-surface-2" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-surface-2" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-surface-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
