"use client";

import { GenericFrame } from "@/visuals/generic/Frame";
import type { CompareSpec } from "@/visuals/generic/specs";

/** Side-by-side comparisons: tables, Venn diagrams, pros/cons and before/after (SPEC §4.1 item 7). */
export function Compare({ spec }: { spec: CompareSpec }) {
  const title =
    spec.title ??
    {
      table: "Comparison",
      venn: "What they share",
      "pros-cons": "Pros and cons",
      "before-after": "Before and after",
    }[spec.style];
  return (
    <GenericFrame icon="⚖️" title={title} caption={spec.caption}>
      {spec.style === "table" && spec.columns && spec.rows && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                {spec.columns.map((c, i) => (
                  <th key={i} scope="col" className="px-3 py-2 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spec.rows.map((r) => (
                <tr key={r.label} className="border-b border-border last:border-0">
                  <th scope="row" className="px-3 py-2 font-semibold">
                    {r.label}
                  </th>
                  {r.cells.map((c, i) => (
                    <td key={i} className="px-3 py-2 text-muted">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {spec.style === "venn" && spec.sets && <Venn sets={spec.sets} shared={spec.shared ?? []} />}
      {(spec.style === "pros-cons" || spec.style === "before-after") && (
        <div className="grid gap-px bg-border sm:grid-cols-2">
          {(
            [
              [
                spec.leftLabel ?? (spec.style === "pros-cons" ? "👍 Pros" : "Before"),
                spec.left ?? [],
                "text-success",
              ],
              [
                spec.rightLabel ?? (spec.style === "pros-cons" ? "👎 Cons" : "After"),
                spec.right ?? [],
                "text-danger",
              ],
            ] as const
          ).map(([label, items, color], i) => (
            <div key={i} className="bg-surface p-3">
              <p className={`font-semibold ${spec.style === "pros-cons" ? color : "text-primary"}`}>
                {label}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </GenericFrame>
  );
}

const vennColors = ["var(--primary)", "#f59e0b", "#10b981"];

function Venn({ sets, shared }: { sets: { label: string; items: string[] }[]; shared: string[] }) {
  const three = sets.length === 3;
  const circles = three
    ? [
        { cx: 160, cy: 120 },
        { cx: 260, cy: 120 },
        { cx: 210, cy: 205 },
      ]
    : [
        { cx: 160, cy: 150 },
        { cx: 280, cy: 150 },
      ];
  return (
    <div className="flex flex-col gap-3 p-3">
      <svg
        viewBox="0 0 440 300"
        className="mx-auto block w-full max-w-md"
        role="img"
        aria-label={`Venn diagram of ${sets.map((s) => s.label).join(", ")}`}
      >
        {circles.map((c, i) => (
          <circle
            key={i}
            cx={c.cx}
            cy={c.cy}
            r={three ? 95 : 110}
            fill={vennColors[i]}
            fillOpacity={0.18}
            stroke={vennColors[i]}
            strokeWidth={2}
          />
        ))}
        {sets.map((s, i) => (
          <text
            key={s.label}
            x={three ? [95, 325, 210][i] : [95, 345][i]}
            y={three ? [40, 40, 295][i] : 35}
            textAnchor="middle"
            fontSize="14"
            fontWeight="600"
            fill="var(--fg)"
          >
            {s.label}
          </text>
        ))}
        <text
          x={three ? 210 : 220}
          y={three ? 150 : 155}
          textAnchor="middle"
          fontSize="13"
          fill="var(--fg)"
        >
          {shared.length ? "shared ↓" : ""}
        </text>
      </svg>
      <div className={`grid gap-2 text-sm ${three ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
        {sets.map((s, i) => (
          <div
            key={s.label}
            className="rounded-lg border p-2"
            style={{ borderColor: vennColors[i] }}
          >
            <p className="font-semibold">Only {s.label}</p>
            <ul className="list-disc pl-4 text-muted">
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
        <div className="rounded-lg border border-border bg-surface-2 p-2">
          <p className="font-semibold">Shared</p>
          <ul className="list-disc pl-4 text-muted">
            {shared.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
