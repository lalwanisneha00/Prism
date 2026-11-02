import type { ReactNode } from "react";
import { modeFor, type Mode, type ThemeId } from "@/lib/theme";

/**
 * Shows its children in another theme without changing the rest of the page: the same two
 * attributes as <html>, on a box. globals.css scopes every theme block to work this way.
 */
export function ThemeScope({
  theme,
  mode,
  className = "",
  children,
}: {
  theme: ThemeId;
  mode: Mode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-theme={theme}
      data-mode={modeFor(theme, mode)}
      data-theme-root=""
      className={className}
    >
      {children}
    </div>
  );
}
