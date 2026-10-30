"use client";

import { FlagDialog } from "@/components/flags/FlagDialog";
import { SyllabusFlagForm } from "@/components/flags/SyllabusFlagForm";
import { findSubject } from "@/lib/subjects";
import { courseCodes } from "@/lib/syllabusFix/flags";

/**
 * The flag icon next to a subject in a list (Start a lesson, the semester's subjects): a different
 * semester of my branch, not in my branch, shown twice. PDEU courses only, like the course page.
 */
export function SubjectFlag({ subjectId }: { subjectId: string }) {
  const s = findSubject(subjectId);
  if (!s || s.university !== "pdeu") return null;
  return (
    <FlagDialog label={`Report a problem with ${s.name}`} title={`Report: ${s.name}`}>
      {(close) => (
        <SyllabusFlagForm
          subject={{ id: s.id, name: s.name, codes: courseCodes(s) }}
          levels={["course"]}
          onClose={close}
        />
      )}
    </FlagDialog>
  );
}
