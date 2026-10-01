"use client";

import { useMemo, useRef, useState, type PointerEvent } from "react";
import { fieldLines, type PointCharge } from "@/visuals/physics";
import { chargeColor, makeScale, WidgetButton, WidgetShell } from "@/visuals/ui";

const W = 640;
const H = 400;
const bounds = { xMin: -4, xMax: 4, yMin: -2.5, yMax: 2.5 };

/** Electric field lines around point charges. Drag the charges to see the field change. */
export function FieldLines({
  charges: initial,
  caption,
}: {
  charges: PointCharge[];
  caption: string;
}) {
  const [charges, setCharges] = useState(initial);
  const [dragging, setDragging] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const { sx, sy, ux, uy } = makeScale(bounds, W, H);
  const lines = useMemo(() => fieldLines(charges, bounds), [charges]);

  function toWorld(e: PointerEvent) {
    const rect = svg.current!.getBoundingClientRect();
    return {
      x: ux(((e.clientX - rect.left) / rect.width) * W),
      y: uy(((e.clientY - rect.top) / rect.height) * H),
    };
  }

  function move(e: PointerEvent) {
    if (dragging === null) return;
    const p = toWorld(e);
    const x = Math.min(bounds.xMax - 0.3, Math.max(bounds.xMin + 0.3, p.x));
    const y = Math.min(bounds.yMax - 0.3, Math.max(bounds.yMin + 0.3, p.y));
    setCharges((cs) => cs.map((c, i) => (i === dragging ? { ...c, x, y } : c)));
  }

  return (
    <WidgetShell
      title="Electric field lines"
      caption={caption}
      controls={
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <WidgetButton
            onClick={() =>
              setCharges((cs) => (cs.length < 4 ? [...cs, { q: 1, x: 0, y: 1.5 }] : cs))
            }
          >
            Add + charge
          </WidgetButton>
          <WidgetButton
            onClick={() =>
              setCharges((cs) => (cs.length < 4 ? [...cs, { q: -1, x: 0, y: -1.5 }] : cs))
            }
          >
            Add − charge
          </WidgetButton>
          <WidgetButton onClick={() => setCharges((cs) => cs.map((c) => ({ ...c, q: -c.q })))}>
            Flip all signs
          </WidgetButton>
          <WidgetButton onClick={() => setCharges(initial)}>Reset</WidgetButton>
        </div>
      }
    >
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full touch-none select-none"
        role="img"
        aria-label={`Field lines for ${charges.length} charge${charges.length > 1 ? "s" : ""}. Drag a charge to move it.`}
        onPointerMove={move}
        onPointerUp={() => setDragging(null)}
        onPointerLeave={() => setDragging(null)}
      >
        {lines.map((line, i) => (
          <polyline
            key={i}
            points={line.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ")}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="1.8"
            opacity="0.75"
          />
        ))}
        {charges.map((c, i) => (
          <g
            key={i}
            transform={`translate(${sx(c.x)} ${sy(c.y)})`}
            onPointerDown={(e) => {
              (e.target as Element).setPointerCapture?.(e.pointerId);
              setDragging(i);
            }}
            className="cursor-grab"
          >
            <circle
              r={16 + 3 * Math.abs(c.q)}
              fill={chargeColor(c.q)}
              stroke="white"
              strokeWidth="2"
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fill="white"
              fontSize="20"
              fontWeight="700"
            >
              {c.q > 0 ? "+" : "−"}
            </text>
          </g>
        ))}
      </svg>
    </WidgetShell>
  );
}
