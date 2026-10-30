"use client";

import { FlagDialog } from "@/components/flags/FlagDialog";
import { SyllabusFlagForm } from "@/components/flags/SyllabusFlagForm";
import { findSubject, type Subject } from "@/lib/subjects";
import { activeChapters } from "@/lib/syllabusFix/active";
import { courseCodes } from "@/lib/syllabusFix/flags";

/** The flag icon on a chapter row: the chapter's own flags and its topics' flags. */
export function ChapterFlag({ owner, chapterId }: { owner: Subject; chapterId: string }) {
  // The course as Prism has it (not narrowed to the student's uploaded syllabus).
  const full = findSubject(owner.id) ?? owner;
  const chapters = activeChapters(full);
  const chapter = chapters.find((c) => c.id === chapterId);
  if (!chapter) return null;
  return (
    <FlagDialog
      label={`Report a problem with chapter ${chapter.name}`}
      title={`Report a problem: ${chapter.name}`}
    >
      {(close) => (
        <SyllabusFlagForm
          subject={{ id: full.id, name: full.name, codes: courseCodes(full) }}
          levels={["chapter", "topic", "course"]}
          chapters={chapters}
          chapter={chapter.id}
          onClose={close}
        />
      )}
    </FlagDialog>
  );
}
