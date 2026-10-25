"use client";

import { useState } from "react";
import { FlagDialog } from "@/components/flags/FlagDialog";
import { LessonFlagForm } from "@/components/flags/LessonFlagForm";
import type { Subject } from "@/lib/subjects";
import { activeChapters } from "@/lib/syllabusFix/active";
import { courseCodes } from "@/lib/syllabusFix/flags";

/** The flag button on a lesson (topic lessons and each topic of a chapter lesson). PDEU only. */
export function LessonFlag({
  subject,
  chapterId,
  topicId,
  level,
  durationMin,
}: {
  subject: Subject;
  chapterId: string;
  topicId: string;
  level: string;
  durationMin: number;
}) {
  // The text the student selected, read before the tap moves the focus.
  const [selected, setSelected] = useState("");
  if (subject.university !== "pdeu") return null;
  const chapters = activeChapters(subject);
  const chapter = chapters.find((c) => c.id === chapterId);
  if (!chapter) return null;
  const codes = courseCodes(subject);
  return (
    <span
      onPointerDownCapture={() => {
        setSelected(window.getSelection()?.toString().trim() ?? "");
      }}
    >
      <FlagDialog label="Report a problem with this lesson" text="Report" title="Report a problem">
        {(close) => (
          <LessonFlagForm
            lesson={{
              subject: { id: subject.id, name: subject.name, codes },
              chapter,
              chapters,
              topic: topicId,
              level,
              durationMin,
              excerpt: selected,
            }}
            onClose={close}
          />
        )}
      </FlagDialog>
    </span>
  );
}
