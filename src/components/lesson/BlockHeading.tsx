import type { ComponentProps, ReactNode } from "react";

/** A titled block on the lesson page; the id makes it linkable from the contents list. */
export function LessonBlockShell({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20" data-lesson-block="">
      <h2 id={`${id}-title`} className="mb-4 text-2xl font-bold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Card({ children, className = "", ...rest }: ComponentProps<"div">) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 sm:p-6 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
