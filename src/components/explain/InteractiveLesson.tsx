"use client";

import { useRef, type ReactNode } from "react";
import { SelectionPopup } from "@/components/explain/SelectionPopup";
import { LessonContext } from "@/components/explain/useExplain";
import type { Lesson } from "@/lib/schema";

/** The lesson page frame: shares the lesson with the help tools and adds the selection popup. */
export function InteractiveLesson({ lesson, children }: { lesson: Lesson; children: ReactNode }) {
  const article = useRef<HTMLElement>(null);
  return (
    <LessonContext.Provider value={lesson}>
      <article ref={article} className="flex flex-col gap-10">
        {children}
      </article>
      <SelectionPopup container={article} />
    </LessonContext.Provider>
  );
}
