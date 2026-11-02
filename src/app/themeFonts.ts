import {
  Archivo,
  Atkinson_Hyperlegible_Mono,
  Atkinson_Hyperlegible_Next,
  Bricolage_Grotesque,
  DM_Mono,
  DM_Sans,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  IBM_Plex_Sans_Condensed,
  Instrument_Sans,
  JetBrains_Mono,
  Literata,
  Manrope,
  Newsreader,
  Public_Sans,
  Source_Serif_4,
} from "next/font/google";

/*
 * The faces of the six newer themes (all free Google Fonts, self-hosted by Next at build time).
 * preload: false = the browser downloads a face only when the active theme uses it, so a student
 * on one theme never downloads the other themes' fonts. The Themes page previews do load them.
 */

// Notebook
const publicSans = Public_Sans({ variable: "--font-public", subsets: ["latin"], preload: false });
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  axes: ["opsz"],
  preload: false,
});
// Reading Room
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  axes: ["opsz"],
  preload: false,
});
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  axes: ["opsz"],
  preload: false,
});
// Drafting Table
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  preload: false,
});
const plexCond = IBM_Plex_Sans_Condensed({
  variable: "--font-plex-cond",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  preload: false,
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});
// Midnight Desk
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  preload: false,
});
const atkinsonMono = Atkinson_Hyperlegible_Mono({
  variable: "--font-atkinson-mono",
  subsets: ["latin"],
  preload: false,
});
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], preload: false });
// Index
const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  preload: false,
});
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  preload: false,
});
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  preload: false,
});
// Studio
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
  preload: false,
});
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], preload: false });
const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  preload: false,
});

/** The CSS variables for every theme face, put on <html>. */
export const themeFontVariables = [
  publicSans,
  sourceSerif,
  literata,
  newsreader,
  plexSans,
  plexCond,
  plexMono,
  atkinson,
  atkinsonMono,
  manrope,
  instrument,
  archivo,
  jetbrains,
  bricolage,
  dmSans,
  dmMono,
]
  .map((f) => f.variable)
  .join(" ");
