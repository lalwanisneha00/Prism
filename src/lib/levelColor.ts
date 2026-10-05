import type { LevelSlug } from "@/data/levels";

/** The learning levels each own one spectrum colour (tokens in globals.css), used wherever a level shows. */
export const levelColor = (slug: LevelSlug | string) => `var(--level-${slug})`;
