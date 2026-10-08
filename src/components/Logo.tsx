import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

/**
 * The Prism logo: the prism picture on its black tile (public/logo-prism.png, made by
 * scripts/make-icons.mjs; the browser-tab icons come from the same picture).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-prism.png"
      alt=""
      width={128}
      height={128}
      priority
      className={className}
      aria-hidden="true"
    />
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
