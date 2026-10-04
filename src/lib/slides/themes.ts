/*
 * Four designed looks for decks and PDFs (Feature B). Each has its own palette, type pairing,
 * title style and one small recurring detail, and none borrows a stock template. Fonts are ones
 * that exist on Windows, macOS and Google Slides, so a deck keeps its look wherever it opens.
 * PDFs embed Noto Sans / Noto Serif instead, so they look the same everywhere too.
 */

export type ThemeId = "paper" | "chalk" | "blueprint" | "spectrum";

export type Theme = {
  id: ThemeId;
  name: string;
  description: string;
  /** Hex colours without "#". */
  bg: string;
  /** A card or table row sitting on the background. */
  card: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
  /** Text colour on top of the accent colour. */
  onAccent: string;
  /** Thin lines and rules. */
  rule: string;
  /** Slide fonts (installed on Windows, macOS and Google Slides). */
  headingFont: string;
  bodyFont: string;
  labelFont: string;
  /** Which embedded face headings use in PDFs. */
  pdfHeading: "serif" | "sans";
  /** The recurring detail drawn on every slide or page. */
  detail: "double-rule" | "chalk-line" | "corner-ticks" | "spectrum-bar";
  /** Headings in capitals (blueprint). */
  upper: boolean;
};

/** The six learning levels each own one spectrum colour (also used by the app redesign). */
export const SPECTRUM = ["E4572E", "F3A712", "A8C256", "29A19C", "3B6EA8", "7B4B94"] as const;

export const THEMES: readonly Theme[] = [
  {
    id: "paper",
    name: "Ink & Paper",
    description: "Warm paper, deep ink and one vermilion accent. A well-set textbook page.",
    bg: "F5EFE3",
    card: "FFFDF8",
    ink: "1D2330",
    muted: "5C6370",
    accent: "B8432F",
    accent2: "2F5D62",
    onAccent: "FFFFFF",
    rule: "1D2330",
    headingFont: "Georgia",
    bodyFont: "Arial",
    labelFont: "Arial",
    pdfHeading: "serif",
    detail: "double-rule",
    upper: false,
  },
  {
    id: "chalk",
    name: "Chalkboard",
    description: "Slate green with chalk white and a yellow underline. Readable from the back row.",
    bg: "22302F",
    card: "2C3D3B",
    ink: "F1EFE6",
    muted: "AEB9B4",
    accent: "F2C14E",
    accent2: "8ED1B2",
    onAccent: "22302F",
    rule: "F1EFE6",
    headingFont: "Trebuchet MS",
    bodyFont: "Verdana",
    labelFont: "Trebuchet MS",
    pdfHeading: "sans",
    detail: "chalk-line",
    upper: false,
  },
  {
    id: "blueprint",
    name: "Blueprint",
    description: "Drafting-table navy with fine cyan lines, figure numbers and corner marks.",
    bg: "0F2438",
    card: "163550",
    ink: "EAF4FA",
    muted: "8FB4CC",
    accent: "5CC8E8",
    accent2: "F2A65A",
    onAccent: "0F2438",
    rule: "5CC8E8",
    headingFont: "Arial",
    bodyFont: "Arial",
    labelFont: "Courier New",
    pdfHeading: "sans",
    detail: "corner-ticks",
    upper: true,
  },
  {
    id: "spectrum",
    name: "Spectrum",
    description: "Clean off-white with Prism's six-colour band, and an editorial serif.",
    bg: "FBFAF6",
    card: "FFFFFF",
    ink: "14171C",
    muted: "5E6570",
    accent: "1F6F78",
    accent2: "E4572E",
    onAccent: "FFFFFF",
    rule: "14171C",
    headingFont: "Times New Roman",
    bodyFont: "Trebuchet MS",
    labelFont: "Trebuchet MS",
    pdfHeading: "serif",
    detail: "spectrum-bar",
    upper: false,
  },
];

export function findTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
