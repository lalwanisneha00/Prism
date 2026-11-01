"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { MockSubject } from "@/components/mock/useMockSubjects";
import type { PaperInfo } from "@/lib/mock/plan";

const PaperUpload = dynamic(
  () => import("@/components/mock/PaperUpload").then((m) => m.PaperUpload),
  { ssr: false, loading: () => <div className="h-32 animate-pulse rounded-xl bg-surface-2" /> },
);

/**
 * The line at the top of Mock Tests: upload past papers so mocks follow the university's own
 * pattern, with how many papers each subject already has.
 */
export function PatternBanner({
  subjects,
  papers,
  subject,
  onAdded,
}: {
  subjects: readonly MockSubject[];
  papers: readonly PaperInfo[];
  subject?: string;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const counts = subjects
    .map((s) => ({ s, n: papers.filter((p) => p.subject === s.subject.id).length }))
    .filter((c) => c.n > 0);
  return (
    <section
      aria-label="Your university's paper pattern"
      className="flex flex-col gap-3 rounded-2xl border border-primary/40 bg-primary-soft/40 p-4"
      data-testid="pattern-banner"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm">
          <strong>
            Upload your previous year papers and this year&apos;s internal assessment / mid-sem
            papers
          </strong>{" "}
          so your mocks match your university&apos;s exact pattern.
        </p>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
        >
          {open ? "Close" : "Upload papers"}
        </button>
      </div>
      {counts.length > 0 ? (
        <ul className="flex flex-wrap gap-2 text-xs">
          {counts.map(({ s, n }) => (
            <li
              key={s.subject.id}
              className="rounded-full border border-border bg-surface px-3 py-1"
            >
              {n} {n === 1 ? "paper" : "papers"} uploaded for {s.subject.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">
          No papers uploaded yet: mocks use a standard Indian university pattern.
        </p>
      )}
      {open && subjects.length > 0 && (
        <PaperUpload subjects={subjects} subject={subject} onAdded={onAdded} />
      )}
    </section>
  );
}
