/** Parses an AI reply as JSON, tolerating code fences or chatter around the object. */
export function parseJsonReply(text: string): unknown {
  // Usually an object; sometimes the AI answers with a bare list instead.
  const objectStart = text.indexOf("{");
  const arrayStart = text.indexOf("[");
  const isArray = arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart);
  const start = isArray ? arrayStart : objectStart;
  const end = text.lastIndexOf(isArray ? "]" : "}");
  if (start === -1 || end <= start) throw new Error("the reply contains no JSON object");
  try {
    return JSON.parse(repairLatexEscapes(text.slice(start, end + 1)));
  } catch (err) {
    // Sometimes a complete object is followed by more text containing a brace (a second copy,
    // or chatter like "{see above}"). Then the first balanced object is the reply.
    const firstEnd = endOfFirstValue(text, start);
    if (firstEnd !== -1 && firstEnd < end) {
      try {
        return JSON.parse(repairLatexEscapes(text.slice(start, firstEnd + 1)));
      } catch {
        // Fall through to the bracket repair.
      }
    }
    // Long replies from the small models sometimes close their brackets in the wrong order at
    // the very end ("}]}]" for "}}]}"): put the right closers back, then try once more.
    const balanced = balanceBrackets(text.slice(start));
    if (balanced === null) throw err;
    try {
      return JSON.parse(repairLatexEscapes(balanced));
    } catch {
      throw err;
    }
  }
}

/**
 * Fixes closing brackets that don't match what is open (outside strings): a "]" where an object
 * must close becomes "}", and the other way round; the text ends where the outer value closes,
 * and any brackets still open at the end are closed. Null when nothing needed fixing.
 */
export function balanceBrackets(json: string): string | null {
  const stack: ("}" | "]")[] = [];
  let out = "";
  let inString = false;
  let changed = false;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (inString) {
      out += ch;
      if (ch === "\\") out += json[++i] ?? "";
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") {
      const want = stack.pop();
      if (!want) {
        changed = true;
        break;
      }
      if (want !== ch) changed = true;
      out += want;
      if (stack.length === 0) {
        if (json.slice(i + 1).trim()) changed = true;
        return changed ? out : null;
      }
      continue;
    }
    out += ch;
  }
  if (inString || stack.length === 0) return changed ? out : null;
  // Cut off before it closed: drop a dangling comma and close what is open.
  return out.replace(/,\s*$/, "") + stack.reverse().join("");
}

/** Index of the bracket that closes the object or list opening at `start`, or -1. */
function endOfFirstValue(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") depth++;
    else if ((ch === "}" || ch === "]") && --depth === 0) return i;
  }
  return -1;
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
