import type { LessonRequest } from "@/lib/lessonRequest";

/** Breadcrumb, topic title and level/time pills, shown while a lesson loads or fails. */
export function LessonHeader({ request }: { request: LessonRequest }) {
  return (
    <header className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        {request.subject.name} <span aria-hidden="true">›</span> {request.chapter.name}
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        {request.topic.name}
      </h1>
      <ul className="flex flex-wrap gap-2 text-sm">
        <li className="rounded-full bg-primary-soft px-3 py-1 font-medium text-primary">
          {request.level.name}
        </li>
        <li className="rounded-full border border-border bg-surface px-3 py-1">
          {request.duration} min
        </li>
      </ul>
    </header>
  );
}
