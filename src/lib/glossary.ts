import type { Element, ElementContent, Root, RootContent } from "hast";

/*
 * Glossary hover cards (SPEC §8, V2 · Step 7). The lesson lists key terms; the first time
 * each term appears in a block of text it is marked so the page can show its definition.
 */

export type GlossaryEntry = { term: string; definition: string };

export type Segment = { text: string; term?: string };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Splits text into plain pieces and term matches (whole words, any case). Each term is
 * marked once: `used` remembers terms already marked in this block. Longer terms win, so
 * "electric flux" is matched before "flux".
 */
export function splitByTerms(text: string, terms: string[], used: Set<string>): Segment[] {
  const open = terms
    .filter((t) => t.trim() && !used.has(t.toLowerCase()))
    .sort((a, b) => b.length - a.length);
  if (open.length === 0) return [{ text }];

  const pattern = new RegExp(
    // An optional plural ending: "field line" also marks "field lines".
    `(?<![\\p{L}\\p{N}])(${open.map(escape).join("|")})(?:e?s)?(?![\\p{L}\\p{N}])`,
    "giu",
  );
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const key = match[1].toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    if (match.index > last) segments.push({ text: text.slice(last, match.index) });
    const term = open.find((t) => t.toLowerCase() === key) ?? match[0];
    segments.push({ text: match[0], term });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

/** Elements whose text must never be touched: maths, code and links. */
function isProtected(node: Element): boolean {
  if (["code", "pre", "a", "button"].includes(node.tagName)) return true;
  const cls: unknown = node.properties?.className;
  const classes = Array.isArray(cls)
    ? cls.map(String)
    : typeof cls === "string"
      ? cls.split(" ")
      : [];
  return classes.some((c) => c.startsWith("katex"));
}

/**
 * A rehype plugin: wraps the first appearance of each glossary term in
 * <span data-glossary="term">, which the Markdown component turns into a hover card.
 */
export function rehypeGlossary(options: { terms: string[] }) {
  return (tree: Root) => {
    const used = new Set<string>();
    const walk = (parent: Root | Element) => {
      const next: (RootContent | ElementContent)[] = [];
      for (const child of parent.children) {
        if (child.type === "text") {
          for (const seg of splitByTerms(child.value, options.terms, used)) {
            next.push(
              seg.term
                ? {
                    type: "element",
                    tagName: "span",
                    properties: { dataGlossary: seg.term },
                    children: [{ type: "text", value: seg.text }],
                  }
                : { type: "text", value: seg.text },
            );
          }
        } else {
          if (child.type === "element" && !isProtected(child)) walk(child);
          next.push(child);
        }
      }
      parent.children = next as typeof parent.children;
    };
    walk(tree);
  };
}
