import type { ReactNode } from "react";
import { TERMINALS, type ComponentType } from "@/lib/labs/circuit/model";
import type { Pt } from "@/lib/labs/circuit/layout";

/*
 * Standard circuit symbols (syllabus fix, Phase 7C), drawn along the x axis from -30 to 30 and
 * turned to lie between two points. Polarised parts are flipped so their + (or anode) is always
 * at the terminal it is really wired from, and + / - are marked.
 */

const zigzag = "M-30 0h6l4-8 8 16 8-16 8 16 8-16 4 8h6";
const sine = "M-9 0c3-9 6-9 9 0s6 9 9 0";

const BODY: Record<ComponentType, ReactNode> = {
  resistor: <path d={zigzag} />,
  rheostat: (
    <>
      <path d={zigzag} />
      <path d="M-16 14 16-14M10-14h6v6" />
    </>
  ),
  potentiometer: (
    <>
      <path d={zigzag} />
      <path d="M0-22v12M-4-14l4 4 4-4" />
    </>
  ),
  bulb: (
    <>
      <path d="M-30 0h16M14 0h16" />
      <circle r="14" />
      <path d="M-10-10 10 10M10-10-10 10" />
    </>
  ),
  fuse: (
    <>
      <path d="M-30 0h30h30" />
      <rect x="-14" y="-6" width="28" height="12" />
    </>
  ),
  battery: (
    <>
      <path d="M-30 0h26M8 0h22M-4-16v32M8-8v16" strokeWidth={2.5} />
    </>
  ),
  "dc-supply": (
    <>
      <path d="M-30 0h14M16 0h14" />
      <circle r="16" />
      <path d="M-6-8v16M4-4v8" strokeWidth={2.5} />
    </>
  ),
  "solar-cell": (
    <>
      <path d="M-30 0h26M8 0h22M-4-14v28M8-7v14" strokeWidth={2.5} />
      <path d="M-14-26l8 8M-6-26l8 8M-8-18l2 0 0-2M0-18l2 0 0-2" />
    </>
  ),
  "ac-supply": (
    <>
      <path d="M-30 0h14M16 0h14" />
      <circle r="16" />
      <path d={sine} />
    </>
  ),
  "function-generator": (
    <>
      <path d="M-30 0h14M16 0h14" />
      <circle r="16" />
      <path d={sine} />
      <path d="M-4-22h8" />
    </>
  ),
  capacitor: <path d="M-30 0h26M4 0h26M-4-12v24M4-12v24" strokeWidth={2.5} />,
  "electrolytic-capacitor": (
    <path d="M-30 0h26M8 0h22M-4-12v24M8-12c-6 6-6 18 0 24" strokeWidth={2.5} />
  ),
  inductor: <path d="M-30 0h6a6 6 0 0 1 12 0a6 6 0 0 1 12 0a6 6 0 0 1 12 0a6 6 0 0 1 12 0h6" />,
  diode: <path d="M-30 0h20M10 0h20M-10-10v20l20-10zM10-10v20" />,
  led: (
    <>
      <path d="M-30 0h20M10 0h20M-10-10v20l20-10zM10-10v20" />
      <path d="M2-14l6-8M8-12l6-8M6-22h2v2M12-20h2v2" />
    </>
  ),
  zener: <path d="M-30 0h20M10 0h20M-10-10v20l20-10zM6-14l4 4v20l4 4" />,
  photodiode: (
    <>
      <path d="M-30 0h20M10 0h20M-10-10v20l20-10zM10-10v20" />
      <path d="M-4-24l6 8M4-24l6 8M2-16h-2v-2M10-16h-2v-2" />
    </>
  ),
  ammeter: <Meter />,
  voltmeter: <Meter />,
  galvanometer: <Meter />,
  oscilloscope: (
    <>
      <path d="M-30 0h12M18 0h12" />
      <rect x="-18" y="-14" width="36" height="28" rx="3" />
      <path d={sine} />
    </>
  ),
  switch: (
    <>
      <path d="M-30 0h18M12 0h18M-12 0l22-12" />
      <circle cx="-12" r="2.5" />
      <circle cx="12" r="2.5" />
    </>
  ),
  motor: <Meter />,
  "transistor-npn": <Meter />,
  "transistor-pnp": <Meter />,
  transformer: <Meter />,
  ic: <Meter />,
  microcontroller: <Meter />,
  sensor: <Meter />,
  module: <Meter />,
};

function Meter() {
  return (
    <>
      <path d="M-30 0h14M16 0h14" />
      <circle r="16" />
    </>
  );
}

/** Letters drawn upright in the middle of round symbols. */
const LETTER: Partial<Record<ComponentType, string>> = {
  ammeter: "A",
  voltmeter: "V",
  galvanometer: "G",
  motor: "M",
  "transistor-npn": "Q",
  "transistor-pnp": "Q",
  transformer: "T",
  ic: "IC",
  microcontroller: "μC",
  sensor: "S",
  module: "M",
};

/** Polarised parts: the side the + / anode is drawn on (-1 = left, the start of the axis). */
const POLARISED: Partial<Record<ComponentType, string>> = {
  battery: "+",
  "dc-supply": "+",
  "solar-cell": "+",
  "function-generator": "+",
  "electrolytic-capacitor": "+",
  ammeter: "+",
  voltmeter: "+",
  galvanometer: "+",
  oscilloscope: "+",
  motor: "+",
  diode: "anode",
  led: "anode",
  zener: "anode",
  photodiode: "anode",
};

/** One part between a and b; `from` is the terminal wired at a. */
export function CircuitSymbol({
  type,
  a,
  b,
  from,
  lit,
}: {
  type: ComponentType;
  a: Pt;
  b: Pt;
  from: string;
  lit?: boolean;
}) {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const plusAt = POLARISED[type];
  // Drawn with + on the left; flip when the part is wired the other way round.
  const flip = plusAt !== undefined && from !== plusAt;
  const marks = plusAt === "+" && TERMINALS[type]?.includes("-");
  // Keep text upright: a symbol pointing left is drawn turned by 180° and flipped back.
  const upsideDown = Math.abs(angle) > 90;
  const turn = upsideDown ? angle - 180 : angle;
  const mirror = flip !== upsideDown;
  const lead = Math.max(0, len / 2 - 30);
  const body = (
    <g
      transform={`translate(${mid.x} ${mid.y}) rotate(${turn})`}
      color={lit ? "var(--primary)" : "var(--fg)"}
      stroke="currentColor"
      strokeWidth={lit ? 3 : 2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={`M${-len / 2} 0h${lead}M${30} 0h${lead}`} />
      <g transform={mirror ? "scale(-1 1)" : undefined}>{BODY[type]}</g>
    </g>
  );
  const letter = LETTER[type];
  // + and - sit beside the ends of the symbol, on the side away from the wire.
  const u = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  let n = { x: -u.y, y: u.x };
  if (n.y > 0.1 || (Math.abs(n.y) <= 0.1 && n.x < 0)) n = { x: -n.x, y: -n.y };
  const plusEnd = from === plusAt ? -1 : 1;
  const mark = (sign: number) => ({
    x: mid.x + u.x * 26 * sign + n.x * 14,
    y: mid.y + u.y * 26 * sign + n.y * 14 + 5,
  });
  return (
    <g>
      {body}
      {letter && (
        <text
          x={mid.x}
          y={mid.y + (letter.length > 1 ? 4 : 6)}
          textAnchor="middle"
          fontSize={letter.length > 1 ? 12 : 17}
          fontWeight={700}
          fill={lit ? "var(--primary)" : "var(--fg)"}
        >
          {letter}
        </text>
      )}
      {marks && (
        <g
          fill={lit ? "var(--primary)" : "var(--fg)"}
          fontSize={15}
          fontWeight={700}
          textAnchor="middle"
        >
          <text {...mark(plusEnd)}>+</text>
          <text {...mark(-plusEnd)}>−</text>
        </g>
      )}
    </g>
  );
}
