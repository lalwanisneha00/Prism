import type { VisualSpec } from "@/lib/schema";

const labels: Record<VisualSpec["type"], string> = {
  widget: "Interactive widget",
  phet: "PhET simulation",
  mermaid: "Diagram",
  plot: "Graph",
  image: "Image",
};

/** Placeholder until the visual library lands in Step 8: shows what will appear here. */
export function VisualSlot({ visual }: { visual: VisualSpec }) {
  return (
    <figure className="rounded-xl border border-dashed border-border bg-surface-2 p-4">
      <p className="text-sm font-semibold">{labels[visual.type]}</p>
      <figcaption className="mt-1 text-sm text-muted">{visual.caption}</figcaption>
    </figure>
  );
}
