"use client";

import { FlagDialog } from "@/components/flags/FlagDialog";
import { SyllabusFlagForm } from "@/components/flags/SyllabusFlagForm";

/** The flag on a course page: not in my semester, not in my branch, shown twice. */
export function CourseFlag({
  subject,
}: {
  subject: { id: string; name: string; codes: string[] };
}) {
  return (
    <FlagDialog
      label={`Report a problem with ${subject.name}`}
      text="Report"
      title="Report a problem with this course"
    >
      {(close) => <SyllabusFlagForm subject={subject} levels={["course"]} onClose={close} />}
    </FlagDialog>
  );
}
