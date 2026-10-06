"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KEYS_CHANGED_EVENT } from "@/lib/byok/events";
import { listApiKeys } from "@/lib/byok/store";
import { FLAGS } from "@/lib/flags";

/**
 * A strip at the very top of every page until the student has added an API key of their own.
 * It goes away as soon as a key is saved (and comes back if they remove all their keys).
 */
export function AddKeyBar() {
  // null = not checked yet (nothing is shown, so the bar never flashes for people who have a key).
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    let live = true;
    const check = () =>
      listApiKeys()
        .then((keys) => live && setHasKey(keys.length > 0))
        // Storage blocked: we can't keep a key here anyway, so don't nag.
        .catch(() => live && setHasKey(true));
    void check();
    window.addEventListener(KEYS_CHANGED_EVENT, check);
    return () => {
      live = false;
      window.removeEventListener(KEYS_CHANGED_EVENT, check);
    };
  }, []);

  if (!FLAGS.byoKey || hasKey !== false) return null;
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-primary px-4 py-2 text-center text-sm text-primary-fg"
      data-testid="add-key-bar"
    >
      <span className="font-semibold">Prism needs your own free API key to make lessons.</span>
      <Link
        href="/settings/keys#add-key"
        className="rounded-full bg-bg px-4 py-1.5 text-sm font-bold tracking-wide text-primary uppercase hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bg"
      >
        Add your API key
      </Link>
    </div>
  );
}
