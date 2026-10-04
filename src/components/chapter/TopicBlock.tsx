"use client";

import Link from "next/link";
import { InteractiveLesson } from "@/components/explain/InteractiveLesson";
import { MakeFlashcardsButton } from "@/components/flashcards/MakeFlashcardsButton";
import { Markdown } from "@/components/lesson/Markdown";
import { SectionView } from "@/components/lesson/SectionView";
import { Misconceptions } from "@/components/lesson/StaticBlocks";
import { WorkedExample } from "@/components/lesson/WorkedExample";
import type { Lesson } from "@/lib/schema";

/**
 * One topic inside a chapter lesson: its explanation, worked examples and common mistakes.
 * It is wrapped like a single-topic lesson, so highlights, comments and "Explain simpler"
 * work here and are shared with the topic's own lesson page.
 */
export function TopicBlock({
  lesson,
  index,
  minutes,
  recap,
  href,
}: {
  lesson: Lesson;
  index: number;
  minutes: number;
  recap: boolean;
  href: string;
}) {
  return (
    <InteractiveLesson lesson={lesson}>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-primary">
            Topic {index + 1} · {minutes} min{recap ? " · short recap" : ""}
          </p>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-tight">{lesson.meta.title}</h2>
            <MakeFlashcardsButton lesson={lesson} />
          </div>
          <Markdown className="text-muted">{lesson.hook}</Markdown>
        </header>
        {lesson.sections.map((s, i) => (
          <SectionView
            key={s.id}
            section={s}
            index={i}
            sources={lesson.meta.sources}
            glossary={lesson.glossary}
            interactive
          />
        ))}
        {!recap && lesson.workedExamples.length > 0 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Worked examples</h3>
            {lesson.workedExamples.map((e, i) => (
              <WorkedExample key={i} example={e} index={i} />
            ))}
          </div>
        )}
        {!recap && lesson.misconceptions.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold">Common mistakes</h3>
            <Misconceptions items={lesson.misconceptions} />
          </div>
        )}
        <Link href={href} className="w-fit text-sm font-semibold text-primary underline">
          Open this topic as its own lesson →
        </Link>
      </div>
    </InteractiveLesson>
  );
}
