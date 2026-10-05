import Link from "next/link";
import { site } from "@/lib/site";

/** A prism outline with the six level colours leaving it: flat, no gradient. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M13 4 25 26H1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {[
        "first-encounter",
        "building-blocks",
        "second-chance",
        "deep-dive",
        "exam-prep",
        "last-minute",
      ].map((level, i) => (
        <line
          key={level}
          x1="20"
          y1={13 + i * 2.2}
          x2="31"
          y2={8 + i * 3.6}
          stroke={`var(--level-${level})`}
          strokeWidth="1.8"
        />
      ))}
    </svg>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-md text-lg font-bold tracking-tight text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <LogoMark className="size-7" />
      {site.name}
    </Link>
  );
}
