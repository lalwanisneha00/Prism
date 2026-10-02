"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import { findLevel } from "@/data/levels";
import type { RecentTopic } from "@/lib/storage/db";
import { clearRecent, listRecent } from "@/lib/storage/library";

/** "Pick up where you left off": the last few topics opened on this device. */
export function RecentTopics() {
  const { dataVersion } = useAuth();
  const [recent, setRecent] = useState<RecentTopic[]>([]);

  useEffect(() => {
    listRecent()
      .then(setRecent)
      .catch(() => setRecent([]));
  }, [dataVersion]);

  if (recent.length === 0) return null;

  return (
    <section aria-labelledby="recent-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recent-title" className="font-semibold">
          Recent topics
        </h2>
        <button
          type="button"
          onClick={() => clearRecent().then(() => setRecent([]))}
          className="text-sm text-muted underline underline-offset-2 hover:text-fg"
        >
          Clear
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {recent.map((r) => {
          const params = new URLSearchParams({
            subject: r.subject,
            chapter: r.chapter,
            topic: r.topic,
            level: r.level,
            duration: String(r.duration),
          });
          return (
            <li key={r.id}>
              <Link
                href={`/lesson?${params}`}
                className="flex flex-col rounded-xl border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="font-semibold">{r.title}</span>
                <span className="text-xs text-muted">
                  {findLevel(r.level)?.name ?? r.level} · {r.duration} min
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
