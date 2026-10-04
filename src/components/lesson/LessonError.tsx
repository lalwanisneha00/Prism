import Link from "next/link";
import { errorCopy, type LessonErrorKind } from "@/lib/lessonEvents";

/** A friendly explanation of what went wrong, with a way forward. */
export function LessonError({
  kind,
  onRetry,
  ownKey,
  onUseShared,
}: {
  kind: LessonErrorKind;
  onRetry: () => void;
  /** The provider's name when the student's own key was used for this request. */
  ownKey?: string;
  onUseShared?: () => void;
}) {
  const copy = ownKey ? ownKeyCopy(kind, ownKey) : errorCopy[kind];
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
        {ownKey && onUseShared && (
          <button
            type="button"
            onClick={onUseShared}
            className="rounded-full border border-primary px-5 py-2.5 font-semibold text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Retry with Prism&apos;s shared free key
          </button>
        )}
        {ownKey && (
          <Link
            href="/settings/keys"
            className="rounded-full border border-border px-5 py-2.5 font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Check my key
          </Link>
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

/** What went wrong when the student's own key was used (their key, so we say which). */
function ownKeyCopy(kind: LessonErrorKind, provider: string): { title: string; message: string } {
  switch (kind) {
    case "auth":
      return {
        title: `Your ${provider} key was rejected`,
        message:
          "The key may be mistyped, switched off, or out of credit. Check it under Settings → Your API keys, or use Prism's shared key for this lesson.",
      };
    case "rate-limit":
      return {
        title: `Your ${provider} key is out of quota`,
        message:
          "It has hit its limit for now (a free tier resets daily; a paid key may need credit). Wait a little, or use Prism's shared key for this lesson.",
      };
    case "offline":
      return errorCopy.offline;
    default:
      return {
        title: `${provider} didn't give a usable answer`,
        message:
          "The provider may be down, or the chosen model can't write lessons well. Try again, pick another model, or use Prism's shared key for this lesson.",
      };
  }
}
