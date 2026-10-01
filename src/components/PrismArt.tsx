const bands = ["#e1306c", "#f97316", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

/** Decorative hero art: a beam of light entering a prism and leaving as a spectrum. */
export function PrismArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 220" className={className} aria-hidden="true">
      <line
        x1="0"
        y1="138"
        x2="118"
        y2="112"
        className="stroke-fg"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {bands.map((color, i) => (
        <polygon
          key={color}
          points={`196,${104 + i * 4} 196,${108 + i * 4} 320,${70 + i * 22} 320,${48 + i * 22}`}
          fill={color}
          opacity="0.9"
        />
      ))}
      <path
        d="M160 30 220 170H100Z"
        className="fill-surface stroke-border"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M160 30 220 170H100Z" fill="url(#prism-glass)" />
      <defs>
        <linearGradient id="prism-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.25" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0.05" />
        </linearGradient>
      </defs>
    </svg>
  );
}
