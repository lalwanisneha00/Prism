"use client";

import type { VisualSpec } from "@/lib/schema";
import dynamic from "next/dynamic";
import { CommonsImage } from "@/visuals/CommonsImage";
import { ChartView } from "@/visuals/generic/ChartView";
import { Compare } from "@/visuals/generic/Compare";
import { FunctionGraph } from "@/visuals/generic/FunctionGraph";
import { StatsExplorer } from "@/visuals/generic/StatsExplorer";
import { StepThrough } from "@/visuals/generic/StepThrough";
import { Derivation } from "@/visuals/Derivation";
import { KeyIdeaCard } from "@/visuals/KeyIdeaCard";
import { MermaidDiagram } from "@/visuals/MermaidDiagram";
import { PhetEmbed } from "@/visuals/PhetEmbed";
import { Plot } from "@/visuals/Plot";
import { visualProblem } from "@/visuals/visualChecks";
import { WidgetView } from "@/visuals/WidgetView";

// The formula explorer brings mathjs, so it is only downloaded when a lesson uses one.
const FormulaExplorer = dynamic(() => import("@/visuals/generic/FormulaExplorer"), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse rounded-xl bg-surface-2" aria-busy="true" />,
});

/** Shows a section's visual using only trusted renderers (SPEC §4). */
export function VisualSlot({ visual }: { visual: VisualSpec }) {
  // Belt and braces: the server already checked this, but never draw an unchecked visual.
  if (visualProblem(visual)) return <KeyIdeaCard caption={visual.caption} />;

  switch (visual.type) {
    case "widget":
      return <WidgetView widget={visual.widget} params={visual.params} caption={visual.caption} />;
    case "phet":
      return <PhetEmbed sim={visual.sim} caption={visual.caption} />;
    case "mermaid":
      return <MermaidDiagram code={visual.code} caption={visual.caption} />;
    case "plot":
      return (
        <Plot
          expression={visual.expression}
          xRange={visual.xRange}
          xLabel={visual.xLabel}
          yLabel={visual.yLabel}
          caption={visual.caption}
        />
      );
    case "chart":
      return <ChartView spec={visual} />;
    case "graph":
      return <FunctionGraph spec={visual} />;
    case "formula":
      return <FormulaExplorer spec={visual} />;
    case "compare":
      return <Compare spec={visual} />;
    case "steps":
      return <StepThrough spec={visual} />;
    case "stats":
      return <StatsExplorer spec={visual} />;
    case "derivation":
      return <Derivation steps={visual.steps} caption={visual.caption} />;
    case "image":
      return <CommonsImage file={visual.file} alt={visual.alt} caption={visual.caption} />;
  }
}
