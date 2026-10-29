import type { ReactNode } from "react";
import type { ApparatusIconName } from "@/lib/labs/apparatusIcons";

/*
 * Line drawings of lab apparatus (syllabus fix, Phase 7C), on a 40 × 40 grid, drawn in the current
 * text colour so they follow light and dark mode. Simple on purpose: they label a setup diagram,
 * they are not technical drawings.
 */

const L = (d: string) => <path d={d} />;

const ICONS: Record<ApparatusIconName, ReactNode> = {
  beaker: L("M11 8h18M13 8v24a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M13 20h14"),
  "conical-flask": L("M17 6h6M17 6v10L9 32a2 2 0 0 0 2 3h18a2 2 0 0 0 2-3L23 16V6M12 27h16"),
  burette: L("M18 2h4v26h-4zM18 8h4M18 14h4M18 20h4M20 28v4M17 32h6M20 32v4"),
  pipette: L("M20 2v8M16 10h8l-2 14h-4zM20 24v14"),
  "test-tube": L("M15 4h10M16 4v26a4 4 0 0 0 8 0V4M16 22h8"),
  "measuring-cylinder": L("M14 4h12M15 4v30h10V4M12 34h16M15 12h4M15 18h6M15 24h4M15 30h6"),
  funnel: L("M8 8h24L22 22v12h-4V22z"),
  "petri-dish": (
    <>
      <ellipse cx="20" cy="22" rx="15" ry="6" />
      <path d="M5 22v4c0 3 7 6 15 6s15-3 15-6v-4" />
      <circle cx="15" cy="21" r="1.5" />
      <circle cx="24" cy="23" r="1.5" />
    </>
  ),
  microscope: L("M15 4l6 2-5 14-6-2zM18 20v6M10 34h20M14 34v-4h12M24 14a8 8 0 0 1 2 16M12 26h10"),
  burner: L("M16 36h8l-1-16h-6zM12 36h16M20 20c-5-4 0-10 0-14 4 4 5 10 0 14"),
  thermometer: (
    <>
      <path d="M17 6a3 3 0 0 1 6 0v20h-6z" />
      <circle cx="20" cy="30" r="5" />
      <path d="M20 12v14M23 12h3M23 18h3" />
    </>
  ),
  balance: L("M20 6v26M8 12h24M8 12l-4 10h8zM32 12l-4 10h8zM14 32h12"),
  stopwatch: (
    <>
      <circle cx="20" cy="22" r="13" />
      <path d="M17 4h6M20 4v5M20 22l6-6M31 9l3-3" />
    </>
  ),
  ruler: L("M4 16h32v8H4zM8 16v4M12 16v3M16 16v4M20 16v3M24 16v4M28 16v3M32 16v4"),
  vernier: L("M4 12h32v6H4zM8 18v14h6V18M24 18v8h-4V18M10 12V8M14 12V8"),
  lens: L("M20 4c6 8 6 24 0 32-6-8-6-24 0-32zM20 2v2M20 36v2"),
  mirror: L("M14 4c8 10 8 22 0 32M14 4l-3 2M14 10l-3 2M15 16l-3 2M15 22l-3 2M14 28l-3 2"),
  prism: L("M20 6l14 26H6zM2 22l10-2M28 22l10 4M28 20l10 0"),
  screen: L("M12 4h4v32h-4zM10 36h8M24 8l-8 4M24 20h-8M24 32l-8-4"),
  lamp: (
    <>
      <circle cx="20" cy="16" r="8" />
      <path d="M17 24h6v6h-6zM16 30h8M20 4V2M10 8 8 6M30 8l2-2M8 16H5M35 16h-3" />
    </>
  ),
  laser: L("M4 14h20v12H4zM24 18h4v4h-4zM28 20h10M32 17l3 3-3 3"),
  slit: L("M18 4h4v13h-4zM18 23h4v13h-4zM4 20h12M24 18l12-6M24 22l12 6"),
  telescope: L("M6 22l24-10 3 7-24 10zM18 26l-4 10M20 26l4 10M30 12l4-2 2 5-3 2"),
  magnet: L("M8 8h8v16a4 4 0 0 0 8 0V8h8v16a12 12 0 0 1-24 0zM8 14h8M24 14h8"),
  coil: L("M6 20h4M10 20c0-6 4-6 4 0s4 6 4 0 4-6 4 0 4 6 4 0 4-6 4 0M30 20h4"),
  compass: (
    <>
      <circle cx="20" cy="20" r="14" />
      <path d="M20 8l3 12-3 12-3-12z" />
      <circle cx="20" cy="20" r="1.5" />
    </>
  ),
  "power-supply": (
    <>
      <rect x="5" y="9" width="30" height="22" rx="2" />
      <path d="M10 15h12v6H10zM26 26v-2M30 26v-2M25 15h4M27 13v4" />
    </>
  ),
  meter: (
    <>
      <rect x="6" y="8" width="28" height="24" rx="3" />
      <path d="M10 22a10 10 0 0 1 20 0M20 22l5-8M14 28h2M24 28h2" />
    </>
  ),
  oscilloscope: (
    <>
      <rect x="4" y="8" width="32" height="24" rx="2" />
      <path d="M7 11h18v16H7zM8 19c2-6 4-6 6 0s4 6 6 0M29 13v2M29 19v2M29 25v2" />
    </>
  ),
  computer: L("M6 6h28v20H6zM16 26l-2 6h12l-2-6M11 32h18"),
  pendulum: (
    <>
      <path d="M8 4h24M20 4l8 22" />
      <circle cx="28" cy="29" r="4" />
      <path d="M20 4v26" strokeDasharray="2 3" />
    </>
  ),
  spring: L("M20 2v4M14 6l12 3-12 3 12 3-12 3 12 3-12 3 12 3M20 27v3M14 30h12v6H14z"),
  weights: L("M12 34h16l-3-12H15zM20 22v-6M17 16h6M14 14l-2-8M26 14l2-8"),
  stand: L("M8 36h24M14 36V4M14 10h16M26 10v6M22 16h8v4h-8z"),
  pump: (
    <>
      <circle cx="18" cy="22" r="10" />
      <path d="M18 22l7-7M28 22h10M4 22h4M12 32l-4 4h20l-4-4" />
    </>
  ),
  tank: L("M8 6h24v28H8zM8 16h24M14 22h12M20 34v4"),
  pipe: L("M2 16h20a6 6 0 0 1 6 6v16M2 24h20M28 38V22"),
  valve: L("M4 16v8l12-4zM36 16v8l-12-4zM20 20V10M14 8h12"),
  gauge: (
    <>
      <circle cx="20" cy="18" r="12" />
      <path d="M20 18l6-6M12 22h2M26 22h2M20 30v8M16 38h8" />
    </>
  ),
  heater: L(
    "M6 28h28v6H6zM10 28c0-4 4-4 4-8s-4-4-4-8M18 28c0-4 4-4 4-8s-4-4-4-8M26 28c0-4 4-4 4-8s-4-4-4-8",
  ),
  motor: (
    <>
      <circle cx="18" cy="20" r="11" />
      <path d="M29 20h8M14 16h8v8h-8zM12 31l-2 5M24 31l2 5" />
    </>
  ),
  gear: (
    <>
      <circle cx="20" cy="20" r="8" />
      <circle cx="20" cy="20" r="3" />
      <path d="M20 6v6M20 28v6M6 20h6M28 20h6M10 10l4 4M26 26l4 4M30 10l-4 4M14 26l-4 4" />
    </>
  ),
  beam: L("M4 16h32v6H4zM6 22l-2 8h8zM34 22l-2 8h8zM20 6v10M17 12l3 4 3-4"),
  specimen: L("M8 14h6v12H8zM26 14h6v12h-6zM14 17h12v6H14z"),
  "testing-machine": L("M8 4h24v6H8zM10 10v26M30 10v26M8 36h24M14 18h12v4H14zM20 22v6M14 28h12"),
  sieve: L("M6 12h28l-3 14H9zM9 18h22M10 22h20M14 12v14M20 12v14M26 12v14M12 30h16"),
  hammer: L("M8 8h14v8H8zM22 10l6-2v8l-6-2M15 16v20"),
  file: L("M18 4h4v24h-4zM18 8l4 2M18 12l4 2M18 16l4 2M18 20l4 2M16 28h8v8h-8z"),
  vice: L("M6 30h28v6H6zM10 30V14h8v16M22 30V14h8v16M18 18h4M34 22h4"),
  saw: L("M4 16h26l-4 8H6zM6 24l2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3 2 3 2-3M30 12h6v12h-6"),
  drill: L("M6 10h20v10H6zM26 13h4v4h-4zM30 15h8M12 20l-2 14h8l-2-14"),
  lathe: L("M4 30h32v6H4zM6 14h8v16H6zM14 20h16M28 16v8M30 18h6v10h-6z"),
  "welding-torch": L("M4 30l16-16 4 4L8 34zM24 18l6-6M30 12l3-1-1 3M33 8l2-2M35 13h3M30 6V3"),
  "try-square": L("M8 6v28h28v-6H14V6zM14 22h4M14 16h4M14 10h4"),
  centrifuge: (
    <>
      <rect x="6" y="14" width="28" height="20" rx="3" />
      <ellipse cx="20" cy="14" rx="14" ry="4" />
      <path d="M20 14l6-2M20 14l-6-2M20 14v3" />
    </>
  ),
  incubator: L("M6 4h28v32H6zM10 8h20v16H10zM10 18h20M28 28h2M10 28h12"),
  spectrophotometer: L("M4 12h32v20H4zM8 16h10v8H8zM24 16h8v4h-8zM28 12V6h4v6M10 28h4M18 28h4"),
  "gel-tank": L("M4 14h32v16H4zM8 18h24v8H8zM12 18v3M17 18v3M22 18v3M27 18v3M2 22h2M36 22h2"),
  sample: L("M14 6h12M16 6v6l-6 18a3 3 0 0 0 3 4h14a3 3 0 0 0 3-4l-6-18V6M12 26h16"),
};

export function ApparatusIcon({ name, size = 40 }: { name: ApparatusIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

/** The same drawing placed inside another SVG (setup diagrams). */
export function ApparatusIconAt({
  name,
  x,
  y,
  size,
}: {
  name: ApparatusIconName;
  x: number;
  y: number;
  size: number;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${size / 40})`}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </g>
  );
}
