"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDataVersion } from "@/components/account/AuthProvider";
import { hasMaterialFor } from "@/lib/custom/store";

/** Non-core course page: has the student uploaded their faculty's material yet? (Phase 4B) */
export function MaterialStatus({ subjectId }: { subjectId: string }) {
  const dataVersion = useDataVersion();
  const [has, setHas] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    hasMaterialFor(subjectId)
      .then((h) => live && setHas(h))
      .catch(() => live && setHas(false));
    return () => {
      live = false;
    };
  }, [subjectId, dataVersion]);

  if (has === null)
    return (
      <div className="h-14 max-w-2xl animate-pulse rounded-xl bg-surface-2" aria-busy="true" />
    );
  return (
    <div
      className={`flex max-w-2xl flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm ${has ? "bg-success/10" : "bg-primary-soft"}`}
      data-testid="material-status"
    >
      <p className="min-w-0 flex-1">
        {has
          ? "Faculty material uploaded: lessons for this subject follow it."
          : "No faculty material uploaded yet. Lessons for this subject need it, so they match your university's syllabus."}
      </p>
      <Link
        href={`/notes?subject=${subjectId}`}
        className={
          has
            ? "rounded-full border border-border px-4 py-1.5 font-semibold hover:bg-surface-2"
            : "rounded-full bg-primary px-4 py-1.5 font-semibold text-primary-fg hover:bg-primary-hover"
        }
      >
        {has ? "Manage material" : "Upload material"}
      </Link>
    </div>
  );
}
