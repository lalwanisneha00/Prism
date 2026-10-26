"use client";

import { FlagDialog } from "@/components/flags/FlagDialog";
import { SyllabusFlagForm } from "@/components/flags/SyllabusFlagForm";
import type { Subject } from "@/lib/subjects";
import { activeChapters } from "@/lib/syllabusFix/active";
import { courseCodes } from "@/lib/syllabusFix/flags";

/** The flag icon next to one topic (or experiment) on the course page: its three topic flags. */
export function TopicFlag({
  owner,
  chapterId,
  topic,
}: {
  owner: Subject;
  chapterId: string;
  topic: { id: string; name: string };
}) {
  return (
    <FlagDialog label={`Report a problem with ${topic.name}`} title={`Report: ${topic.name}`}>
      {(close) => (
        <SyllabusFlagForm
          subject={{ id: owner.id, name: owner.name, codes: courseCodes(owner) }}
          levels={["topic"]}
          chapters={activeChapters(owner)}
          chapter={chapterId}
          topic={topic.id}
          onClose={close}
        />
      )}
    </FlagDialog>
  );
}
