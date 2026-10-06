"use client";

import { useEffect, useState } from "react";
import { SubjectGraph } from "@/components/map/SubjectGraph";
import { loadSubject } from "@/lib/catalogue";
import type { Subject } from "@/lib/subjects";

/** Fetches one subject's map data only when the subject is chosen (not all of them up front). */
export function SubjectGraphLoader({ subjectId }: { subjectId: string }) {
  const [state, setState] = useState<
    { id: string; subject: Subject | null } | { id: string; subject: undefined }
  >({ id: subjectId, subject: undefined });

  useEffect(() => {
    let live = true;
    loadSubject(subjectId)
      .then((s) => live && setState({ id: subjectId, subject: s ?? null }))
      .catch(() => live && setState({ id: subjectId, subject: null }));
    return () => {
      live = false;
    };
  }, [subjectId]);

  if (state.id !== subjectId || state.subject === undefined) {
    return (
      <div
        className="h-96 animate-pulse rounded-2xl bg-surface-2"
        aria-busy="true"
        aria-label="Loading the map"
        data-testid="map-loading"
      />
    );
  }
  if (state.subject === null) {
    return (
      <p role="alert" className="rounded-2xl border border-border p-4 text-sm text-danger">
        This subject&apos;s map couldn&apos;t be loaded. Check your connection and try again.
      </p>
    );
  }
  return <SubjectGraph key={subjectId} subject={state.subject} />;
}
