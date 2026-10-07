import Link from "next/link";
import { site } from "@/lib/site";

/** Bright spectrum for the rays: they sit on the deep tile, so they are lighter than the level colours. */
const RAYS = ["#ff6b4a", "#ffb02e", "#9bd33a", "#2ed3c4", "#5aa0ff", "#b784e6"];

/** A rounded tile with a prism on it: one plain beam goes in, six spectrum rays come out. Flat, no gradient. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <path
        d="M14 6.5 22.5 24H5.5Z"
        fill="none"
        stroke="var(--primary-fg)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line
        x1="2"
        y1="19"
        x2="9.5"
        y2="17.2"
        stroke="var(--primary-fg)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {RAYS.map((color, i) => (
        <line
          key={color}
          x1={17.5 + i * 0.46}
          y1={14.2 + i * 1.2}
          x2="30"
          y2={6 + i * 4.4}
          stroke={color}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-lg text-fg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      aria-label={`${site.name}, home`}
    >
      <LogoMark className="size-9 shrink-0 drop-shadow-sm" />
      <span className="font-display text-2xl leading-none font-bold tracking-tight">
        {site.name}
      </span>
    </Link>
  );
}
