/** Parses an AI reply as JSON, tolerating code fences or chatter around the object. */
export function parseJsonReply(text: string): unknown {
  // Usually an object; sometimes the AI answers with a bare list instead.
  const objectStart = text.indexOf("{");
  const arrayStart = text.indexOf("[");
  const isArray = arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart);
  const start = isArray ? arrayStart : objectStart;
  const end = text.lastIndexOf(isArray ? "]" : "}");
  if (start === -1 || end <= start) throw new Error("the reply contains no JSON object");
  return JSON.parse(repairLatexEscapes(text.slice(start, end + 1)));
}

/*
 * LaTeX commands whose first letter is also a JSON escape (\b \f \n \r \t \u). Written with
 * one backslash they would silently become a backspace, form feed, newline, return or tab.
 */
const AMBIGUOUS_LATEX = new Set(
  (
    "beta bar bf binom big bigg bigl bigr boldsymbol bot bullet bmod backslash begin boxed breve " +
    "frac forall flat frown " +
    "nabla neq ne nu not neg nolimits nonumber nearrow ni notin " +
    "rho right rightarrow rangle rceil rfloor rm rvert " +
    "theta tau times text textbf textit textrm tan tanh to tilde top triangle tfrac therefore textstyle " +
    "underline underbrace uparrow upsilon"
  ).split(" "),
);

/**
 * AI replies often forget to double the backslashes of LaTeX inside JSON strings
 * ("\omega" instead of "\\omega"). Inside string values only, this doubles a backslash that
 * starts a LaTeX command, leaving real escapes (\n, \", \\, é) untouched.
 */
export function repairLatexEscapes(json: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (!inString) {
      if (ch === '"') inString = true;
      out += ch;
      continue;
    }
    if (ch === '"') {
      inString = false;
      out += ch;
      continue;
    }
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = json[i + 1] ?? "";
    const word = /^[a-zA-Z]+/.exec(json.slice(i + 1))?.[0] ?? "";
    const validEscape =
      /["\\/bfnrt]/.test(next) || (next === "u" && /^u[0-9a-fA-F]{4}/.test(json.slice(i + 1)));
    const isLatex = word.length > 0 && (!validEscape || AMBIGUOUS_LATEX.has(word));
    // Anything else that isn't a JSON escape (\( \' \0 \{ in code or maths) is a literal backslash.
    if (isLatex || !validEscape) {
      out += "\\\\"; // a LaTeX command: keep the backslash as a real character
    } else {
      out += ch + next; // a genuine escape, copied as-is (including \\ and \")
      i++;
    }
  }
  return out;
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
          items.push(JSON.parse(repairLatexEscapes(text.slice(itemStart, i + 1))));
        } catch {
          // A malformed item is skipped here; full validation happens at the end.
        }
        itemStart = -1;
      }
    }
  }
  return items;
}
