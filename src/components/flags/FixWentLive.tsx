"use client";

import { useMemo, useState } from "react";
import { useMyFixes } from "@/components/flags/useMyFixes";
import { Icon } from "@/components/Icon";
import { thanksLine } from "@/lib/syllabusFix/credits";

/*
 * "Your fix went live" (syllabus fix, Phase 7): once per fix, the first time the student comes
 * back after a change they reported, uploaded or agreed with went live. Remembered on this device.
 */

const SEEN_KEY = "prism.fixesThanked";

function seen(): Set<string> {
  try {
    const list = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as unknown;
    return new Set(Array.isArray(list) ? list.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function markSeen(ids: readonly string[]) {
  try {
    const all = [...new Set([...seen(), ...ids])].slice(-300);
    localStorage.setItem(SEEN_KEY, JSON.stringify(all));
  } catch {
    // Storage blocked: the thank-you may show again, which is harmless.
  }
}

export function FixWentLive() {
  const fixes = useMyFixes();
  const [dismissed, setDismissed] = useState(false);
  const fresh = useMemo(() => {
    if (!fixes) return [];
    const already = seen();
    return fixes.filter((f) => !already.has(f.proposalId));
  }, [fixes]);

  if (dismissed || fresh.length === 0) return null;
  const [first] = fresh;
  const more = fresh.length - 1;
  return (
    <section
      aria-label="Your syllabus fix went live"
      data-testid="fix-went-live"
      className="flex flex-col gap-2 rounded-2xl border border-success/40 bg-success/10 p-4 text-sm"
    >
      <p>
        <Icon name="verified" /> {thanksLine(first)}
        {more > 0 && ` And ${more} more of your fixes went live too.`}
      </p>
      <button
        type="button"
        onClick={() => {
          markSeen(fresh.map((f) => f.proposalId));
          setDismissed(true);
        }}
        className="w-fit rounded-full border border-border bg-surface px-4 py-1.5 font-semibold hover:bg-surface-2"
      >
        Thanks, got it
      </button>
    </section>
  );
}

/** The account page's count: "You helped fix 3 things in the syllabus". */
export function MyFixesCount() {
  const fixes = useMyFixes();
  if (!fixes || fixes.length === 0) return null;
  const n = fixes.length;
  return (
    <details className="text-sm" data-testid="my-fixes-count">
      <summary className="w-fit cursor-pointer font-semibold">
        <Icon name="verified" /> You helped fix {n} thing{n === 1 ? "" : "s"} in the syllabus
      </summary>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted">
        {fixes.map((f) => (
          <li key={f.proposalId}>
            {f.text} ({f.students} student{f.students === 1 ? "" : "s"})
          </li>
        ))}
      </ul>
    </details>
  );
}
