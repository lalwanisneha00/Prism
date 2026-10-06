"use client";

import type { VisualSpec } from "@/lib/schema";
import dynamic from "next/dynamic";
import { KeyIdeaCard } from "@/visuals/KeyIdeaCard";
import { visualProblem } from "@/visuals/visualChecks";
import { WidgetView } from "@/visuals/WidgetView";

/** A visual's code is fetched only when a lesson uses that kind of visual (charts, maths, diagrams…). */
const placeholder = () => (
  <div className="h-72 animate-pulse rounded-xl bg-surface-2" aria-busy="true" role="status" />
);
const CommonsImage = dynamic(() => import("@/visuals/CommonsImage").then((m) => m.CommonsImage), {
  ssr: false,
  loading: placeholder,
});
const ChartView = dynamic(() => import("@/visuals/generic/ChartView").then((m) => m.ChartView), {
  ssr: false,
  loading: placeholder,
});
const Compare = dynamic(() => import("@/visuals/generic/Compare").then((m) => m.Compare), {
  ssr: false,
  loading: placeholder,
});
const FunctionGraph = dynamic(
  () => import("@/visuals/generic/FunctionGraph").then((m) => m.FunctionGraph),
  { ssr: false, loading: placeholder },
);
const StatsExplorer = dynamic(
  () => import("@/visuals/generic/StatsExplorer").then((m) => m.StatsExplorer),
  { ssr: false, loading: placeholder },
);
const StepThrough = dynamic(
  () => import("@/visuals/generic/StepThrough").then((m) => m.StepThrough),
  { ssr: false, loading: placeholder },
);
const Derivation = dynamic(() => import("@/visuals/Derivation").then((m) => m.Derivation), {
  ssr: false,
  loading: placeholder,
});
const MermaidDiagram = dynamic(
  () => import("@/visuals/MermaidDiagram").then((m) => m.MermaidDiagram),
  { ssr: false, loading: placeholder },
);
const PhetEmbed = dynamic(() => import("@/visuals/PhetEmbed").then((m) => m.PhetEmbed), {
  ssr: false,
  loading: placeholder,
});
const Plot = dynamic(() => import("@/visuals/Plot").then((m) => m.Plot), {
  ssr: false,
  loading: placeholder,
});

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
