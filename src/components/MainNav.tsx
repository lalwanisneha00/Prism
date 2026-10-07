"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

const links: { href: string; label: string; icon: IconName; testId?: string }[] = [
  { href: "/start", label: "Start a lesson", icon: "idea", testId: "nav-start-lesson" },
  { href: "/subjects", label: "Subjects", icon: "study" },
  { href: "/library", label: "Library", icon: "library" },
  { href: "/flashcards", label: "Flashcards", icon: "cards" },
  { href: "/map", label: "Concept maps", icon: "map" },
  { href: "/my-notes", label: "My notes", icon: "note" },
  { href: "/notes", label: "Uploads", icon: "book" },
  { href: "/dashboard", label: "Dashboard", icon: "chart" },
];

/**
 * The main links. On a wide screen they sit in the header next to the logo (icon and name on a very wide
 * screen, icon only in between); on a phone or a narrow window they form a second row that scrolls
 * sideways inside itself, so nothing is squeezed and the page never scrolls sideways.
 */
export function MainNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="order-3 -mx-4 w-[calc(100%+2rem)] overflow-x-auto border-t border-border px-4 py-1.5 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:order-2 lg:mx-0 lg:w-auto lg:min-w-0 lg:flex-1 lg:overflow-x-auto lg:border-t-0 lg:px-0 lg:py-0"
    >
      <ul className="flex items-center gap-1 whitespace-nowrap lg:justify-center">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                title={l.label}
                aria-current={active ? "page" : undefined}
                data-testid={l.testId}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  active ? "bg-primary-soft text-primary" : "text-fg"
                }`}
              >
                <Icon name={l.icon} />
                <span className="lg:max-[1439px]:sr-only">{l.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
