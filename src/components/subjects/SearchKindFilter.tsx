"use client";

import { useId } from "react";
import { Icon, type IconName } from "@/components/Icon";
import type { SearchKind } from "@/lib/catalogueSearch";

const OPTIONS: { kind: SearchKind; label: string; icon?: IconName }[] = [
  { kind: "all", label: "All" },
  { kind: "theory", label: "Theory", icon: "book" },
  { kind: "labs", label: "Labs", icon: "lab" },
];

/** All / Theory / Labs under a search box: labs can be searched on their own (Phase 4B). */
export function SearchKindFilter({
  value,
  onChange,
}: {
  value: SearchKind;
  onChange: (kind: SearchKind) => void;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-wrap items-center gap-2 text-sm" data-testid="search-kind">
      <legend className="sr-only">Search in</legend>
      {OPTIONS.map((o) => (
        <label
          key={o.kind}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${
            value === o.kind
              ? "border-primary bg-primary-soft text-primary"
              : "border-border text-muted hover:bg-surface-2"
          }`}
        >
          <input
            type="radio"
            name={name}
            value={o.kind}
            checked={value === o.kind}
            onChange={() => onChange(o.kind)}
            className="sr-only"
          />
          {o.icon && <Icon name={o.icon} />}
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
