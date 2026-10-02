"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { BoxPlot } from "@/visuals/generic/BoxPlot";
import { palette } from "@/visuals/generic/Frame";
import type { ChartSpec } from "@/visuals/generic/specs";

const axisTick = { fill: "var(--muted)", fontSize: 12 };
const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--fg)",
};
const fmt = (v: unknown) =>
  typeof v === "number" ? String(Number(v.toPrecision(4))) : String(v ?? "");

/** Draws a chart spec with Recharts (loaded only when a lesson needs a chart). */
export default function ChartInner({ spec }: { spec: ChartSpec }) {
  const unit = spec.unit ?? "";
  const rows = (spec.categories ?? []).map((category, i) => {
    const row: Record<string, string | number> = { category };
    for (const s of spec.series ?? []) row[s.name] = s.values[i];
    return row;
  });
  const xAxis = (
    <XAxis
      dataKey="category"
      tick={axisTick}
      label={{ value: spec.xLabel, position: "insideBottom", offset: -4, fill: "var(--muted)" }}
      height={44}
    />
  );
  const yAxis = (
    <YAxis
      tick={axisTick}
      tickFormatter={fmt}
      width={56}
      label={{ value: spec.yLabel, angle: -90, position: "insideLeft", fill: "var(--muted)" }}
    />
  );
  const grid = <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />;
  const tooltip = <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${fmt(v)}${unit}`} />;
  const legend = (spec.series?.length ?? 0) > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null;
  const margin = { top: 12, right: 16, bottom: 8, left: 8 };

  let chart: React.ReactElement;
  switch (spec.chart) {
    case "line":
      chart = (
        <LineChart data={rows} margin={margin}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {legend}
          {spec.series?.map((s, i) => (
            <Line
              key={s.name}
              dataKey={s.name}
              stroke={palette[i]}
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      );
      break;
    case "area":
      chart = (
        <AreaChart data={rows} margin={margin}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {legend}
          {spec.series?.map((s, i) => (
            <Area
              key={s.name}
              dataKey={s.name}
              stroke={palette[i]}
              fill={palette[i]}
              fillOpacity={0.25}
            />
          ))}
        </AreaChart>
      );
      break;
    case "bar":
    case "stacked-bar":
      chart = (
        <BarChart data={rows} margin={margin}>
          {grid}
          {xAxis}
          {yAxis}
          {tooltip}
          {legend}
          {spec.series?.map((s, i) => (
            <Bar
              key={s.name}
              dataKey={s.name}
              fill={palette[i]}
              stackId={spec.chart === "stacked-bar" ? "stack" : undefined}
              radius={spec.chart === "bar" ? [4, 4, 0, 0] : 0}
            />
          ))}
        </BarChart>
      );
      break;
    case "pie":
    case "donut": {
      const values = spec.series?.[0]?.values ?? [];
      const total = values.reduce((s, v) => s + v, 0);
      const slices = (spec.categories ?? []).map((name, i) => ({ name, value: values[i] }));
      chart = (
        <PieChart>
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${fmt(v)}${unit}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius={spec.chart === "donut" ? "55%" : 0}
            outerRadius="80%"
            label={({ value }) => `${Math.round((Number(value) / total) * 100)}%`}
          >
            {slices.map((s, i) => (
              <Cell key={s.name} fill={palette[i % palette.length]} stroke="var(--surface)" />
            ))}
          </Pie>
        </PieChart>
      );
      break;
    }
    case "scatter":
      chart = (
        <ScatterChart margin={margin}>
          {grid}
          <XAxis
            type="number"
            dataKey="x"
            tick={axisTick}
            tickFormatter={fmt}
            name={spec.xLabel}
            label={{
              value: spec.xLabel,
              position: "insideBottom",
              offset: -4,
              fill: "var(--muted)",
            }}
            height={44}
          />
          <YAxis
            type="number"
            dataKey="y"
            tick={axisTick}
            tickFormatter={fmt}
            width={56}
            name={spec.yLabel}
            label={{ value: spec.yLabel, angle: -90, position: "insideLeft", fill: "var(--muted)" }}
          />
          <ZAxis range={[60, 60]} />
          <Tooltip contentStyle={tooltipStyle} />
          {(spec.scatter?.length ?? 0) > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {spec.scatter?.map((s, i) => (
            <Scatter key={s.name} name={s.name} data={s.points} fill={palette[i]} />
          ))}
        </ScatterChart>
      );
      break;
    case "histogram": {
      const bins = (spec.bins ?? []).map((b) => ({
        category: `${fmt(b.from)}–${fmt(b.to)}`,
        count: b.count,
      }));
      chart = (
        <BarChart data={bins} margin={margin} barCategoryGap={1}>
          {grid}
          {xAxis}
          {yAxis}
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="count" name="Count" fill={palette[0]} />
        </BarChart>
      );
      break;
    }
    case "box":
      // Drawn in plain SVG: a Recharts box plot needs too many workarounds.
      return (
        <div className="p-2">
          <BoxPlot spec={spec} />
        </div>
      );
    case "radar":
      chart = (
        <RadarChart data={rows} outerRadius="70%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="category" tick={axisTick} />
          <PolarRadiusAxis tick={axisTick} tickFormatter={fmt} />
          {tooltip}
          {legend}
          {spec.series?.map((s, i) => (
            <Radar
              key={s.name}
              dataKey={s.name}
              stroke={palette[i]}
              fill={palette[i]}
              fillOpacity={0.25}
            />
          ))}
        </RadarChart>
      );
      break;
  }

  return (
    <div className="h-72 w-full p-2 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        {chart}
      </ResponsiveContainer>
    </div>
  );
}
