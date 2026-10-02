"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { AnnotationEditor } from "@/components/annotations/AnnotationEditor";
import { AnnotationsProvider, useAnnotations } from "@/components/annotations/AnnotationsProvider";
import { CommentMarkers } from "@/components/annotations/BlockNotes";
import { SelectionPopup } from "@/components/explain/SelectionPopup";
import { LessonContext } from "@/components/explain/useExplain";
import type { Lesson } from "@/lib/schema";

/**
 * The lesson page frame: shares the lesson with the help tools, adds the selection popup,
 * and the student's own highlights and comments (stored apart from the lesson).
 */
export function InteractiveLesson({ lesson, children }: { lesson: Lesson; children: ReactNode }) {
  const article = useRef<HTMLElement>(null);
  return (
    <LessonContext.Provider value={lesson}>
      <AnnotationsProvider lesson={lesson} container={article}>
        <Article articleRef={article}>{children}</Article>
        <SelectionPopup container={article} />
        <AnnotationEditor />
      </AnnotationsProvider>
    </LessonContext.Provider>
  );
}

function Article({
  articleRef,
  children,
}: {
  articleRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const anno = useAnnotations();
  // The element itself (not the ref) is kept in state so the markers can measure it.
  const [el, setEl] = useState<HTMLElement | null>(null);
  // A stable callback ref: a new function each render would detach and re-attach the ref
  // every time, re-rendering in a loop.
  const attach = useCallback(
    (node: HTMLElement | null) => {
      articleRef.current = node;
      setEl(node);
    },
    [articleRef],
  );
  return (
    <article
      ref={attach}
      data-only-mine={anno?.onlyMine ? "" : undefined}
      className="relative flex flex-col gap-10"
    >
      {children}
      <CommentMarkers container={el} />
    </article>
  );
}
