"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PROVIDERS } from "@/lib/byok/catalogue";
import { getActiveKey } from "@/lib/byok/store";
import { FLAGS } from "@/lib/flags";

/** "Using: your Gemini key" or "Using: Prism's shared key", where lessons are made. */
export function KeyIndicator() {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    getActiveKey()
      .then((k) =>
        setLabel(
          k
            ? `your ${PROVIDERS.find((p) => p.id === k.id)?.name ?? k.id} key`
            : "Prism's shared key",
        ),
      )
      .catch(() => setLabel("Prism's shared key"));
  }, []);
  if (!FLAGS.byoKey || !label) return null;
  return (
    <p className="text-xs text-muted" data-testid="using-key">
      Using: {label} ·{" "}
      <Link href="/settings/keys" className="underline">
        change
      </Link>
    </p>
  );
}
