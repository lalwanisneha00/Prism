"use client";

import dynamic from "next/dynamic";
import { DataNote, GenericFrame } from "@/visuals/generic/Frame";
import type { ChartSpec } from "@/visuals/generic/specs";

// Recharts is only downloaded when a lesson actually contains a chart.
const ChartInner = dynamic(() => import("@/visuals/generic/ChartInner"), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse bg-surface-2 sm:h-80" aria-busy="true" />,
});

const titles: Record<ChartSpec["chart"], string> = {
  line: "Line chart",
  area: "Area chart",
  bar: "Bar chart",
  "stacked-bar": "Stacked bar chart",
  pie: "Pie chart",
  donut: "Donut chart",
  scatter: "Scatter plot",
  histogram: "Histogram",
  box: "Box plot",
  radar: "Radar chart",
};

/** A chart with its title, caption and a note on where the numbers come from. */
export function ChartView({ spec }: { spec: ChartSpec }) {
  return (
    <GenericFrame
      icon="📊"
      title={spec.title ?? titles[spec.chart]}
      caption={spec.caption}
      note={<DataNote data={spec.data} sourceId={spec.sourceId} />}
    >
      <ChartInner spec={spec} />
    </GenericFrame>
  );
}
