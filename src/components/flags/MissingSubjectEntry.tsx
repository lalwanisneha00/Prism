"use client";

import dynamic from "next/dynamic";
import { FlagDialog } from "@/components/flags/FlagDialog";

// The form (and its handout reader) loads only when the student opens it.
const MissingSubjectForm = dynamic(
  () => import("@/components/flags/MissingSubjectForm").then((m) => m.MissingSubjectForm),
  { ssr: false, loading: () => <div className="h-24 animate-pulse rounded-xl bg-surface-2" /> },
);

/** "My subject isn't here" (syllabus fix, Phase 4): the button and its one-line explanation. */
export function MissingSubjectEntry({
  semester,
  hint = "A course of your semester missing from this list? Tell us, and once another student agrees it is added for everyone in your branch.",
}: {
  /** Without it, the form starts from the student's saved semester. */
  semester?: number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1" data-testid="missing-subject">
      <FlagDialog
        label="My subject isn't here"
        text="My subject isn't here"
        title="My subject isn't here"
      >
        {(close) => <MissingSubjectForm semester={semester} onClose={close} />}
      </FlagDialog>
      <p className="text-xs text-muted">{hint}</p>
    </div>
  );
}
