/** Decorative hero art, drawn flat: white light enters a prism and leaves as the six level colours. */
const levels = [
  "var(--level-first-encounter)",
  "var(--level-building-blocks)",
  "var(--level-second-chance)",
  "var(--level-deep-dive)",
  "var(--level-exam-prep)",
  "var(--level-last-minute)",
];

export function PrismArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 240" className={className} aria-hidden="true">
      {/* The incoming beam: one plain line. */}
      <line
        x1="8"
        y1="142"
        x2="128"
        y2="118"
        stroke="var(--fg)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* The six bands leaving the prism, each a level colour. */}
      {levels.map((color, i) => (
        <line
          key={color}
          x1="204"
          y1={108 + i * 3}
          x2="352"
          y2={50 + i * 26}
          stroke={color}
          strokeWidth="9"
          strokeLinecap="butt"
        />
      ))}
      {/* The prism: a flat outline on paper. */}
      <path
        d="M166 36 232 176H100Z"
        fill="var(--surface)"
        stroke="var(--fg)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
