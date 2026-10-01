import Link from "next/link";
import { site } from "@/lib/site";

/** A triangle (the prism) with a spectrum edge. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logo-spectrum" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e1306c" />
          <stop offset="0.35" stopColor="#f59e0b" />
          <stop offset="0.6" stopColor="#10b981" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path d="M16 3 29 27H3Z" fill="url(#logo-spectrum)" />
      <path d="M16 9.5 23.6 24H8.4Z" className="fill-surface" />
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
