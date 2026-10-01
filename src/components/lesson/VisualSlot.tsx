import type { VisualSpec } from "@/lib/schema";
import { CommonsImage } from "@/visuals/CommonsImage";
import { KeyIdeaCard } from "@/visuals/KeyIdeaCard";
import { MermaidDiagram } from "@/visuals/MermaidDiagram";
import { PhetEmbed } from "@/visuals/PhetEmbed";
import { Plot } from "@/visuals/Plot";
import { visualProblem } from "@/visuals/visualChecks";
import { WidgetView } from "@/visuals/WidgetView";

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
    case "image":
      return <CommonsImage file={visual.file} alt={visual.alt} caption={visual.caption} />;
  }
}
