"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { nextSide, reservedWidth, type LabelSide } from "@/lib/navHover";
import { THEME_EVENT } from "@/lib/themeDom";

const links: { href: string; label: string; icon: IconName; testId?: string }[] = [
  { href: "/start", label: "Start a lesson", icon: "idea", testId: "nav-start-lesson" },
  { href: "/subjects", label: "Subjects", icon: "study" },
  { href: "/mock-test", label: "Mock Tests", icon: "exam", testId: "nav-mock-tests" },
  { href: "/library", label: "Library", icon: "library" },
  { href: "/flashcards", label: "Flashcards", icon: "cards" },
  { href: "/map", label: "Concept maps", icon: "map" },
  { href: "/my-notes", label: "My notes", icon: "note" },
  { href: "/notes", label: "Uploads", icon: "book" },
  { href: "/dashboard", label: "Dashboard", icon: "chart" },
];

/** Wait this long after the cursor leaves the menu before closing (crossing a gap stays smooth). */
const CLOSE_DELAY_MS = 80;
/** The icon-only menu: a laptop or desktop with a mouse (see .nav-label in globals.css). */
const ICON_ONLY = "(min-width: 1024px) and (hover: hover)";

type Open = { index: number; side: LabelSide } | null;

/**
 * The main links. On a laptop or desktop with a mouse they are icons only, and the item under
 * the cursor (or with keyboard focus) opens to show its name, one at a time; see lib/navHover.ts
 * for why no icon ever moves under the cursor. On a phone, a narrow window or a touch screen they
 * show icon and name in a row that scrolls sideways inside itself.
 */
export function MainNav() {
  const pathname = usePathname();
  const list = useRef<HTMLUListElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState<Open>(null);
  // The side each name last opened on, so a closing name slides shut where it was.
  const [sides, setSides] = useState<LabelSide[]>(() => links.map(() => "right"));

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(null), CLOSE_DELAY_MS);
  };

  function openItem(i: number) {
    cancelClose();
    if (!matchMedia(ICON_ONLY).matches || open?.index === i) return;
    const side = nextSide(open?.index ?? null, i);
    setOpen({ index: i, side });
    setSides((s) => s.map((v, k) => (k === i ? side : v)));
  }

  // One width for every open name (the longest, in this theme's font), and room for it reserved.
  const measure = useCallback(() => {
    const ul = list.current;
    if (!ul) return;
    if (!matchMedia(ICON_ONLY).matches) {
      ul.style.removeProperty("--nav-reserve");
      ul.style.removeProperty("--nav-label-w");
      return;
    }
    const items = [...ul.children] as HTMLElement[];
    const wrap = (li: HTMLElement) => li.querySelector<HTMLElement>(".nav-label");
    const label = Math.ceil(
      Math.max(...items.map((li) => wrap(li)?.firstElementChild?.scrollWidth ?? 0)),
    );
    const closed = items.map((li) => li.offsetWidth - (wrap(li)?.offsetWidth ?? 0));
    const gap = Number.parseFloat(getComputedStyle(ul).columnGap) || 0;
    ul.style.setProperty("--nav-label-w", `${label}px`);
    ul.style.setProperty(
      "--nav-reserve",
      `${Math.ceil(reservedWidth({ closed, label, gap })) + 1}px`,
    );
  }, []);

  useEffect(() => {
    measure();
    void document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    window.addEventListener(THEME_EVENT, measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener(THEME_EVENT, measure);
      cancelClose();
    };
  }, [measure]);

  const fromMouse = (e: PointerEvent) => e.pointerType !== "touch";

  return (
    <nav
      aria-label="Main"
      className="site-nav order-3 -mx-4 w-[calc(100%+2rem)] overflow-x-auto border-t border-border px-4 py-1.5 sm:-mx-6 sm:w-[calc(100%+3rem)] sm:px-6 lg:order-2 lg:mx-0 lg:w-auto lg:min-w-0 lg:flex-1 lg:overflow-x-auto lg:border-t-0 lg:px-0 lg:py-0"
    >
      <ul
        ref={list}
        onPointerEnter={(e) => fromMouse(e) && cancelClose()}
        onPointerLeave={(e) => fromMouse(e) && closeSoon()}
        className="nav-list flex items-center gap-1 whitespace-nowrap lg:mx-auto"
      >
        {links.map((l, i) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          const isOpen = open?.index === i;
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                aria-label={l.label}
                aria-current={active ? "page" : undefined}
                data-open={isOpen ? "" : undefined}
                data-side={sides[i]}
                data-testid={l.testId}
                onPointerEnter={(e) => fromMouse(e) && openItem(i)}
                onFocus={() => openItem(i)}
                onBlur={() => setOpen((o) => (o?.index === i ? null : o))}
                className={`flex items-center rounded-full px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  active
                    ? "bg-primary-soft text-primary"
                    : `text-fg max-lg:hover:bg-surface-2 ${isOpen ? "bg-surface-2" : ""}`
                }`}
              >
                <Icon name={l.icon} />
                <span className="nav-label" aria-hidden="true">
                  <span>{l.label}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
