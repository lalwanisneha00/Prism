"use client";

import { useState } from "react";
import { findPhetSim, PHET_ATTRIBUTION, PHET_LICENSE, phetEmbedUrl } from "@/data/phet";
import { KeyIdeaCard } from "@/visuals/KeyIdeaCard";

/**
 * A PhET simulation. It loads only when the student asks for it, because simulations
 * are large downloads on a phone data plan. Attribution is shown as CC BY 4.0 requires.
 */
export function PhetEmbed({ sim, caption }: { sim: string; caption: string }) {
  const [open, setOpen] = useState(false);
  const info = findPhetSim(sim);
  if (!info) return <KeyIdeaCard caption={caption} />;
  const url = phetEmbedUrl(info.id);

  return (
    <figure className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3 sm:p-4">
      <p className="text-sm font-semibold">
        <span aria-hidden="true">🧪 </span>Simulation: {info.title}
      </p>
      {open ? (
        <div className="aspect-[16/10] w-full overflow-hidden rounded-lg border border-border bg-black">
          <iframe
            src={url}
            title={`PhET simulation: ${info.title}`}
            className="h-full w-full"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span aria-hidden="true" className="text-4xl">
            ▶
          </span>
          <span className="font-semibold">Load the interactive simulation</span>
          <span className="text-sm text-muted">About 5–15 MB · runs in your browser</span>
        </button>
      )}
      <figcaption className="text-sm text-muted">{caption}</figcaption>
      <p className="text-xs text-muted">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {info.title}
        </a>{" "}
        by {PHET_ATTRIBUTION}, licensed {PHET_LICENSE}.{" "}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary"
        >
          Open full screen ↗
        </a>
      </p>
    </figure>
  );
}
