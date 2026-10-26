"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

// The map (and the subject's full data) loads only when the student opens this section.
const SubjectGraphLoader = dynamic(
  () => import("@/components/map/SubjectGraphLoader").then((m) => m.SubjectGraphLoader),
  { ssr: false, loading: () => <div className="h-96 animate-pulse rounded-2xl bg-surface-2" /> },
);

/** The course's concept map on its page, folded until opened (Phase 4B). */
export function ConceptMapSection({ subjectId }: { subjectId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="rounded-2xl border border-border bg-surface p-4"
      data-testid="course-concept-map"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="cursor-pointer text-lg font-semibold">Concept map</summary>
      <p className="mt-1 text-sm text-muted">
        Every topic and what it builds on. Point at (or tap) a topic to light up what you need to
        know first.
      </p>
      {open && (
        <div className="mt-3">
          <SubjectGraphLoader subjectId={subjectId} />
        </div>
      )}
    </details>
  );
}
