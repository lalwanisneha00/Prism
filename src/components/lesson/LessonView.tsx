import type { ReactNode } from "react";
import { LessonBlockShell } from "@/components/lesson/BlockHeading";
import { Markdown } from "@/components/lesson/Markdown";
import { Quiz } from "@/components/lesson/Quiz";
import { SectionView } from "@/components/lesson/SectionView";
import {
  Analogies,
  FurtherLearning,
  Misconceptions,
  Prerequisites,
  RevisionSheet,
  SourceList,
} from "@/components/lesson/StaticBlocks";
import { WorkedExample } from "@/components/lesson/WorkedExample";
import { blockTitle, levelLayouts, type LessonBlock } from "@/data/levelLayouts";
import type { LessonRequest } from "@/lib/lessonRequest";
import type { Lesson } from "@/lib/schema";

/** A full lesson page. The order and headings of its blocks come from the level's layout. */
export function LessonView({ lesson, request }: { lesson: Lesson; request: LessonRequest }) {
  const layout = levelLayouts[request.level.slug];
  const sources = lesson.meta.sources;

  const render: Record<LessonBlock, () => ReactNode> = {
    prerequisites: () => <Prerequisites items={lesson.prerequisites} />,
    sections: () => {
      const list = (
        <div className="flex flex-col gap-5">
          {lesson.sections.map((s, i) => (
            <SectionView key={s.id} section={s} index={i} sources={sources} />
          ))}
        </div>
      );
      return layout.collapseSections ? (
        <details className="group rounded-2xl border border-border bg-surface-2 p-4">
          <summary className="cursor-pointer font-semibold">
            Show the {lesson.sections.length} explanation sections
          </summary>
          <div className="mt-4">{list}</div>
        </details>
      ) : (
        list
      );
    },
    analogies: () => <Analogies items={lesson.analogies} />,
    workedExamples: () => (
      <div className="flex flex-col gap-4">
        {lesson.workedExamples.map((e, i) => (
          <WorkedExample key={i} example={e} index={i} />
        ))}
      </div>
    ),
    misconceptions: () => <Misconceptions items={lesson.misconceptions} />,
    quiz: () => <Quiz questions={lesson.quiz} />,
    revisionSheet: () => <RevisionSheet sheet={lesson.revisionSheet} />,
    furtherLearning: () => <FurtherLearning links={lesson.furtherLearning} />,
  };

  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          {request.subject.name} <span aria-hidden="true">›</span> {request.chapter.name}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          {lesson.meta.title}
        </h1>
        <ul className="flex flex-wrap gap-2 text-sm">
          <li className="rounded-full bg-primary-soft px-3 py-1 font-medium text-primary">
            {request.level.name}
          </li>
          <li className="rounded-full border border-border bg-surface px-3 py-1">
            {lesson.meta.durationMin} min
          </li>
        </ul>
        <Markdown className="text-lg text-muted">{lesson.hook}</Markdown>
        <nav aria-label="In this lesson" className="text-sm">
          <p className="font-semibold">In this lesson</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {layout.blocks.map((b) => (
              <li key={b}>
                <a
                  href={`#${b}`}
                  className="inline-block rounded-full border border-border bg-surface px-3 py-1 hover:bg-surface-2"
                >
                  {blockTitle(request.level.slug, b)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {layout.blocks.map((b) => (
        <LessonBlockShell key={b} id={b} title={blockTitle(request.level.slug, b)}>
          {render[b]()}
        </LessonBlockShell>
      ))}

      <LessonBlockShell id="sources" title="Sources">
        <SourceList sources={sources} />
        <p className="mt-4 text-sm text-muted">
          AI-generated lessons can contain mistakes. Every section links to the sources it is based
          on, so you can check it.
        </p>
      </LessonBlockShell>
    </article>
  );
}
