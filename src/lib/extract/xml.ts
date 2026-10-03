/*
 * A tiny XML reader. Office and OpenDocument files are ZIP folders full of XML; we only need
 * to walk the tags and read the text, so a small reader that works the same in the browser
 * and in tests is simpler than a full XML library.
 */

export type XmlElement = { name: string; attrs: Record<string, string>; children: XmlNode[] };
export type XmlNode = XmlElement | string;

export function parseXml(src: string): XmlElement {
  const root: XmlElement = { name: "#root", attrs: {}, children: [] };
  const stack: XmlElement[] = [root];
  const top = () => stack[stack.length - 1];
  let i = 0;

  while (i < src.length) {
    const lt = src.indexOf("<", i);
    if (lt === -1) {
      top().children.push(decodeEntities(src.slice(i)));
      break;
    }
    if (lt > i) top().children.push(decodeEntities(src.slice(i, lt)));

    if (src.startsWith("<!--", lt)) {
      i = skipPast(src, "-->", lt + 4);
    } else if (src.startsWith("<![CDATA[", lt)) {
      const end = src.indexOf("]]>", lt + 9);
      top().children.push(src.slice(lt + 9, end === -1 ? src.length : end));
      i = end === -1 ? src.length : end + 3;
    } else if (src.startsWith("<?", lt)) {
      i = skipPast(src, "?>", lt + 2);
    } else if (src.startsWith("<!", lt)) {
      i = skipPast(src, ">", lt + 2);
    } else {
      const gt = tagEnd(src, lt + 1);
      if (gt === -1) break;
      const raw = src.slice(lt + 1, gt);
      i = gt + 1;
      if (raw.startsWith("/")) {
        const name = raw.slice(1).trim();
        for (let k = stack.length - 1; k > 0; k--) {
          if (stack[k].name === name) {
            stack.length = k;
            break;
          }
        }
        continue;
      }
      const selfClosing = raw.endsWith("/");
      const body = selfClosing ? raw.slice(0, -1) : raw;
      const match = /^[^\s/>]+/.exec(body);
      if (!match) continue;
      const el: XmlElement = {
        name: match[0],
        attrs: parseAttrs(body.slice(match[0].length)),
        children: [],
      };
      top().children.push(el);
      if (!selfClosing) stack.push(el);
    }
  }
  return root;
}

function skipPast(src: string, marker: string, from: number): number {
  const end = src.indexOf(marker, from);
  return end === -1 ? src.length : end + marker.length;
}

/** The ">" that closes a tag, ignoring any ">" inside quoted attribute values. */
function tagEnd(src: string, from: number): number {
  let quote = "";
  for (let k = from; k < src.length; k++) {
    const c = src[k];
    if (quote) {
      if (c === quote) quote = "";
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === ">") {
      return k;
    }
  }
  return -1;
}

function parseAttrs(text: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of text.matchAll(/([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    attrs[m[1]] = decodeEntities(m[3] ?? m[4] ?? "");
  }
  return attrs;
}

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeEntities(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, code: string) => {
    if (code[0] !== "#") return NAMED[code.toLowerCase()] ?? whole;
    const n =
      code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    return Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
  });
}

/** "a:t" → "t". Office files use conventional prefixes, but matching the local name is safer. */
export function localName(name: string): string {
  const colon = name.indexOf(":");
  return colon === -1 ? name : name.slice(colon + 1);
}

export function isElement(node: XmlNode): node is XmlElement {
  return typeof node !== "string";
}

/** An attribute by local name ("r:id" matches "id" only if no unprefixed one exists). */
export function attr(el: XmlElement, name: string): string | undefined {
  if (name in el.attrs) return el.attrs[name];
  for (const [key, value] of Object.entries(el.attrs)) {
    if (localName(key) === localName(name)) return value;
  }
  return undefined;
}

export function childElements(el: XmlElement, name?: string): XmlElement[] {
  return el.children.filter(
    (c): c is XmlElement => isElement(c) && (name === undefined || localName(c.name) === name),
  );
}

export function firstChild(el: XmlElement, name: string): XmlElement | undefined {
  return childElements(el, name)[0];
}

/** Every element with this local name, in document order (depth first). */
export function findAll(el: XmlElement, name: string): XmlElement[] {
  const out: XmlElement[] = [];
  const walk = (node: XmlElement) => {
    for (const c of node.children) {
      if (!isElement(c)) continue;
      if (localName(c.name) === name) out.push(c);
      walk(c);
    }
  };
  walk(el);
  return out;
}

export function findFirst(el: XmlElement, name: string): XmlElement | undefined {
  for (const c of el.children) {
    if (!isElement(c)) continue;
    if (localName(c.name) === name) return c;
    const deeper = findFirst(c, name);
    if (deeper) return deeper;
  }
  return undefined;
}

/** A path of local names, e.g. path(slide, "cSld", "spTree"). */
export function path(el: XmlElement, ...names: string[]): XmlElement | undefined {
  let node: XmlElement | undefined = el;
  for (const n of names) node = node && firstChild(node, n);
  return node;
}
