/** Parses an AI reply as JSON, tolerating code fences or chatter around the object. */
export function parseJsonReply(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("the reply contains no JSON object");
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * From a reply that is still streaming in, returns every *complete* object inside the
 * array at `"key": [ ... ]`. Lets the UI show sections as soon as each one is finished.
 */
export function extractCompleteArrayItems(text: string, key: string): unknown[] {
  const keyMatch = new RegExp(`"${key}"\\s*:\\s*\\[`).exec(text);
  if (!keyMatch) return [];

  const items: unknown[] = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let itemStart = -1;

  for (let i = keyMatch.index + keyMatch[0].length; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") {
      if (depth === 0 && ch === "{") itemStart = i;
      depth++;
    } else if (ch === "}" || ch === "]") {
      if (depth === 0) break; // the array itself closed
      depth--;
      if (depth === 0 && ch === "}" && itemStart !== -1) {
        try {
          items.push(JSON.parse(text.slice(itemStart, i + 1)));
        } catch {
          // A malformed item is skipped here; full validation happens at the end.
        }
        itemStart = -1;
      }
    }
  }
  return items;
}
