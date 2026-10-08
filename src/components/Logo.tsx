import Link from "next/link";
import { site } from "@/lib/site";

/** The spectrum leaving the prism, red to violet. Bright, because it sits on the deep tile. */
const RAYS: { color: string; d: string }[] = [
  { color: "#ff5e4d", d: "M37.4 28.6 60 12.5" },
  { color: "#ffa43a", d: "M38.4 31.4 60.5 21.7" },
  { color: "#ffe066", d: "M39.4 34.2 60.8 30.9" },
  { color: "#5ed38a", d: "M40.4 37 60.8 40.1" },
  { color: "#4aa8ff", d: "M41.4 39.8 60.5 49.3" },
  { color: "#a77bff", d: "M42.4 42.6 60 58.5" },
];

/**
 * The Prism mark (also the browser-tab icon, src/app/icon.svg): a deep rounded tile, a glass prism
 * with a faint fill, one plain beam going in and six spectrum rays coming out. Flat colours only.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="#1e5e66" />
      <path
        d="M30 12.5 49.5 49h-39Z"
        fill="#fbf8f1"
        fillOpacity="0.14"
        stroke="#fbf8f1"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M3.5 38.5 20 33.4"
        stroke="#fbf8f1"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <g strokeWidth="3.2" strokeLinecap="round" fill="none">
        {RAYS.map((r) => (
          <path key={r.color} d={r.d} stroke={r.color} />
        ))}
      </g>
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
      <LogoMark className="size-10 shrink-0" />
      <span className="font-display text-[1.65rem] leading-none font-bold tracking-tight">
        {site.name}
      </span>
    </Link>
  );
}
