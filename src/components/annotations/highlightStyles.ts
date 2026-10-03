/*
 * The colours of the student's highlights (V2 · Step 12), painted with the CSS Custom
 * Highlight API. These rules are added to the page when highlights are first drawn instead
 * of living in globals.css: the build's CSS parser doesn't know ::highlight() yet and warned
 * about it on every page load, although browsers support it.
 */

const CSS_TEXT = `
::highlight(prism-important) { background-color: rgb(250 204 21 / 0.45); }
::highlight(prism-confused) { background-color: rgb(248 113 113 / 0.4); }
::highlight(prism-formula) { background-color: rgb(96 165 250 / 0.4); }
::highlight(prism-exam) { background-color: rgb(52 211 153 / 0.42); }
::highlight(prism-comment) {
  text-decoration: underline dotted var(--primary) 2px;
  background-color: rgb(139 92 246 / 0.12);
}`;

const STYLE_ID = "prism-highlight-styles";

/** Adds the highlight colours to the page once. */
export function ensureHighlightStyles(): void {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS_TEXT;
  document.head.appendChild(style);
}
