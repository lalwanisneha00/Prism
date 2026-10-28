/** Lower case, letters and digits only, padded with spaces so phrases match on word starts. */
export const normal = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9*'+-]+/g, " ")
    .trim()} `;

/**
 * Whether a keyword appears in text made by `normal`: a whole word or phrase, or (for keywords of
 * 5+ letters) the start of a longer word ("neutralis" matches "neutralisation"; "ask" never
 * matches "task").
 */
export function hits(text: string, keyword: string): boolean {
  const k = normal(keyword).trim();
  return k.length > 0 && text.includes(` ${k}`) && (text.includes(` ${k} `) || k.length >= 5);
}
