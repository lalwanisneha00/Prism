"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/account/AuthProvider";
import { SyncBadge, syncLabels } from "@/components/account/SyncBadge";

const item =
  "block rounded-lg px-3 py-2 text-sm font-medium hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary";

/** Header control: "Sign in", or the student's photo with a sync dot and a small menu. */
export function AccountMenu() {
  const { status, user, sync, signIn, signOut, error } = useAuth();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (status === "unavailable") return null; // accounts not configured: guest mode only
  if (status === "loading") {
    return (
      <span
        className="size-10 animate-pulse rounded-full bg-surface-2"
        aria-label="Checking sign-in"
      />
    );
  }

  if (status === "signed-out" || !user) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={signIn}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold whitespace-nowrap text-primary-fg hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Sign in
        </button>
        {error && (
          <p
            role="alert"
            className="absolute top-12 right-0 z-50 w-72 rounded-xl border border-border bg-surface p-3 text-sm shadow-lg"
          >
            {error}
          </p>
        )}
      </div>
    );
  }

  const initial = (user.displayName ?? user.email ?? "?").slice(0, 1).toUpperCase();
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu, ${syncLabels[sync ?? "syncing"].text}`}
        className="relative grid size-10 place-items-center overflow-hidden rounded-full border border-border bg-primary-soft font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element -- small Google profile photo
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="size-full object-cover"
          />
        ) : (
          initial
        )}
        <span
          aria-hidden="true"
          className={`absolute right-0.5 bottom-0.5 size-2.5 rounded-full ring-2 ring-surface ${syncLabels[sync ?? "syncing"].dot}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-12 right-0 z-50 w-72 rounded-2xl border border-border bg-surface p-2 shadow-xl"
        >
          <div className="px-3 py-2">
            <p className="font-semibold">{user.displayName ?? "Student"}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
            <div className="mt-2">
              <SyncBadge status={sync} />
            </div>
          </div>
          <hr className="my-1 border-border" />
          <Link href="/dashboard" className={item} role="menuitem" onClick={() => setOpen(false)}>
            My study dashboard
          </Link>
          <Link href="/library" className={item} role="menuitem" onClick={() => setOpen(false)}>
            Saved lessons
          </Link>
          <Link href="/notes" className={item} role="menuitem" onClick={() => setOpen(false)}>
            My notes (PDFs)
          </Link>
          <Link href="/map" className={item} role="menuitem" onClick={() => setOpen(false)}>
            Concept map
          </Link>
          <Link href="/account" className={item} role="menuitem" onClick={() => setOpen(false)}>
            Account, backup &amp; privacy
          </Link>
          <hr className="my-1 border-border" />
          <button
            type="button"
            role="menuitem"
            className={`${item} w-full text-left`}
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
