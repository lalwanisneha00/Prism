"use client";

import { useEffect, useId, useState } from "react";
import { KeyIdeaCard } from "@/visuals/KeyIdeaCard";

type State = { status: "loading" } | { status: "ready"; svg: string } | { status: "failed" };

/**
 * A structure diagram written by the AI in Mermaid syntax. It is parsed first; if the code
 * is invalid the diagram is replaced by a simple key-idea card instead of a broken picture.
 * Mermaid runs in "strict" mode, which sanitises the SVG and disables click handlers.
 */
export function MermaidDiagram({ code, caption }: { code: string; caption: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        const dark = document.documentElement.getAttribute("data-theme") === "dark";
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: dark ? "dark" : "neutral",
          fontFamily: "inherit",
        });
        await mermaid.parse(code);
        const { svg } = await mermaid.render(id, code);
        if (!cancelled) setState({ status: "ready", svg });
      } catch {
        if (!cancelled) setState({ status: "failed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (state.status === "failed") return <KeyIdeaCard caption={caption} />;

  return (
    <figure className="flex flex-col gap-2 rounded-xl border border-border bg-surface-2 p-3 sm:p-4">
      <p className="text-sm font-semibold">Diagram</p>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface p-3">
        {state.status === "loading" ? (
          <div className="h-40 animate-pulse rounded bg-surface-2" aria-label="Loading diagram" />
        ) : (
          <div
            className="mx-auto flex justify-center [&_svg]:h-auto [&_svg]:max-w-full"
            // Mermaid's strict mode returns sanitised SVG (no scripts, no event handlers).
            dangerouslySetInnerHTML={{ __html: state.svg }}
          />
        )}
      </div>
      <figcaption className="text-sm text-muted">{caption}</figcaption>
    </figure>
  );
}
