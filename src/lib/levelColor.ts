import type { LevelSlug } from "@/data/levels";

/** The learning levels each own one spectrum colour (tokens in globals.css), used wherever a level shows. */
export const levelColor = (slug: LevelSlug | string) => `var(--level-${slug})`;

/** The bright spectrum colours of the hero picture, for the small level markers (home page, lesson maker). */
export const spectrumColor = (slug: LevelSlug | string) => `var(--spectrum-${slug})`;
