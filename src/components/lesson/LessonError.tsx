import Link from "next/link";
import { errorCopy, type LessonErrorKind } from "@/lib/lessonEvents";

/** A friendly explanation of what went wrong, with a way forward. */
export function LessonError({ kind, onRetry }: { kind: LessonErrorKind; onRetry: () => void }) {
  const copy = errorCopy[kind];
  const canRetry = kind !== "invalid-request" && kind !== "not-configured";
  return (
    <div
      role="alert"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
    >
      <h2 className="text-2xl font-bold tracking-tight">{copy.title}</h2>
      <p className="text-muted">{copy.message}</p>
      <div className="flex flex-wrap gap-3">
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-primary px-5 py-2.5 font-semibold text-primary-fg hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Try again
          </button>
        )}
        <Link
          href="/#start"
          className="rounded-full border border-border px-5 py-2.5 font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Choose a different topic
        </Link>
      </div>
    </div>
  );
}
