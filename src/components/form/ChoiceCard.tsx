type ChoiceCardProps = {
  name: string;
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  title: string;
  description?: string;
  /** Centred, stacked layout for short options that sit side by side on a phone. */
  compact?: boolean;
  /** A CSS colour for a coloured edge, e.g. the learning level's spectrum colour. */
  accent?: string;
  /** A small pill on the top edge of the card, e.g. "Recommended". It never leaves the card. */
  badge?: string;
};

/** A radio button styled as a tappable card. Arrow keys move between cards in a group. */
export function ChoiceCard({
  name,
  value,
  checked,
  onSelect,
  title,
  description,
  compact = false,
  accent,
  badge,
}: ChoiceCardProps) {
  const layout = compact ? "flex-col items-center gap-1.5 px-2 text-center" : "items-start gap-3";
  return (
    <label
      style={accent ? { borderLeftColor: accent, borderLeftWidth: "4px" } : undefined}
      className={`group relative flex min-w-0 cursor-pointer rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-surface-2 has-checked:border-primary has-checked:bg-primary-soft has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${layout}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2 border-muted group-has-checked:border-primary"
      >
        <span className="size-2 rounded-full bg-primary opacity-0 group-has-checked:opacity-100" />
      </span>
      {badge && (
        <span className="pointer-events-none absolute -top-2.5 left-1/2 max-w-[calc(100%-0.5rem)] -translate-x-1/2 truncate rounded-full bg-primary px-2 py-0.5 text-[0.65rem] leading-4 font-semibold text-primary-fg">
          {badge}
        </span>
      )}
      <span className="flex flex-col gap-0.5">
        <span className={`font-medium ${compact ? "whitespace-nowrap" : ""}`}>{title}</span>
        {description && <span className="text-sm text-muted">{description}</span>}
      </span>
    </label>
  );
}
