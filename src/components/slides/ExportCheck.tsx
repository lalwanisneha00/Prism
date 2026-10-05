"use client";

import "katex/dist/katex.min.css";
import { useState } from "react";
import { renderImages } from "@/lib/slides/render/browser";
import type { SlidePlan } from "@/lib/slides/plan";

const plan: SlidePlan = {
  title: "x",
  subject: "x",
  purpose: "study",
  level: "x",
  topics: ["x"],
  slides: [
    {
      id: "s1",
      layout: "formula",
      title: "Formulas",
      formulas: [
        { key: "latex", caption: "", alt: "" },
        { key: "mermaid", caption: "", alt: "" },
        { key: "widget", caption: "", alt: "" },
        { key: "plot", caption: "", alt: "" },
      ],
      notes: "",
    },
  ],
  visuals: {
    latex: {
      kind: "latex",
      latex: "\\oint \\vec{E}\\cdot d\\vec{A} = \\frac{Q_{enc}}{\\epsilon_0}",
    },
    mermaid: {
      kind: "mermaid",
      code: 'flowchart LR\n  A["Charge"] --> B["Field"]\n  B --> C["Flux"]',
    },
    widget: {
      kind: "visual",
      spec: {
        type: "widget",
        widget: "coulomb-force",
        params: { q1: 2, q2: -3, distance: 0.3 },
        caption: "Two charges",
      },
    },
    plot: {
      kind: "visual",
      spec: {
        type: "plot",
        expression: "1/x^2",
        xRange: [0.5, 5],
        xLabel: "r",
        yLabel: "E",
        caption: "Inverse square",
      },
    },
  },
  credits: [],
};

export function ExportCheck() {
  const [out, setOut] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const { images, failed } = await renderImages(plan, () => undefined);
          setOut(Object.fromEntries(Object.entries(images).map(([k, v]) => [k, v.dataUrl])));
          setFailed(failed);
          setBusy(false);
        }}
        className="w-fit rounded-full bg-primary px-5 py-2 font-semibold text-primary-fg"
      >
        {busy ? "Drawing…" : "Draw pictures"}
      </button>
      {failed.length > 0 && <p data-testid="failed">Failed: {failed.join(", ")}</p>}
      <div className="grid gap-4 md:grid-cols-2" data-testid="export-results">
        {Object.entries(out).map(([k, src]) => (
          <figure key={k} className="rounded border border-border p-2">
            <figcaption className="text-xs">{k}</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={k} className="max-w-full" />
          </figure>
        ))}
      </div>
    </div>
  );
}
