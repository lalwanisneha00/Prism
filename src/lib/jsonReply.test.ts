import { describe, expect, it } from "vitest";
import { balanceBrackets, extractCompleteArrayItems, parseJsonReply } from "@/lib/jsonReply";

describe("parseJsonReply", () => {
  it("parses plain JSON", () => {
    expect(parseJsonReply('{"a":1}')).toEqual({ a: 1 });
  });

  it("ignores code fences and chatter", () => {
    expect(parseJsonReply('Sure!\n```json\n{"a":[1,2]}\n```\nHope that helps')).toEqual({
      a: [1, 2],
    });
  });

  it("repairs LaTeX with single backslashes (the AI's most common JSON mistake)", () => {
    // As the AI writes it: invalid escapes (\o, \O) and "valid" ones that would corrupt (\t, \f, \n).
    const reply = String.raw`{"body": "$\omega = 2\pi f$, $Z = R + jX$, $\theta$, $\frac{1}{2}$, $\nabla \times \vec{B}$, $\Omega$"}`;
    expect(parseJsonReply(reply)).toEqual({
      body: String.raw`$\omega = 2\pi f$, $Z = R + jX$, $\theta$, $\frac{1}{2}$, $\nabla \times \vec{B}$, $\Omega$`,
    });
  });

  it("keeps correctly doubled LaTeX and real escapes intact", () => {
    const reply = String.raw`{"a": "$\\frac{1}{2}$ and \\theta", "b": "line one\nThe next\tcolumn \"quoted\" caf\u00e9 C:\\path"}`;
    expect(parseJsonReply(reply)).toEqual({
      a: String.raw`$\frac{1}{2}$ and \theta`,
      b: 'line one\nThe next\tcolumn "quoted" café C:\\path',
    });
  });

  it("keeps stray backslashes from code and maths instead of failing the whole reply", () => {
    // \( \) maths delimiters, \' and \0 from C code, \usepackage (a \u that isn't a code point).
    const reply = String.raw`{"code": "putchar('\0'); printf(\'hi\')", "math": "\(x\) and \{1\} \usepackage"}`;
    expect(parseJsonReply(reply)).toEqual({
      code: String.raw`putchar('\0'); printf(\'hi\')`,
      math: String.raw`\(x\) and \{1\} \usepackage`,
    });
  });

  it("uses the first complete object when more text with braces follows it", () => {
    expect(parseJsonReply('{"a": "x}"} and a second copy: {"a": 2}')).toEqual({ a: "x}" });
    expect(parseJsonReply('```json\n{"a": [1]}\n```\nNote: {see above}')).toEqual({ a: [1] });
  });

  it("accepts a bare list as the top level", () => {
    expect(parseJsonReply('Here: [{"id": "a"}, {"id": "b"}]')).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("explains when there is no JSON", () => {
    expect(() => parseJsonReply("I can't help with that")).toThrow(/no JSON object/);
  });
});

describe("extractCompleteArrayItems", () => {
  const full = JSON.stringify({
    hook: "x",
    sections: [
      { id: "a", body: 'has "quotes", {braces} and [brackets] and \\backslash' },
      { id: "b", body: "second" },
    ],
    quiz: [{ id: "not-a-section" }],
  });

  it("returns every finished item", () => {
    expect(extractCompleteArrayItems(full, "sections")).toEqual([
      { id: "a", body: 'has "quotes", {braces} and [brackets] and \\backslash' },
      { id: "b", body: "second" },
    ]);
  });

  it("returns only the items finished so far while streaming", () => {
    const cut = full.indexOf('"second"');
    expect(extractCompleteArrayItems(full.slice(0, cut), "sections")).toEqual([
      { id: "a", body: 'has "quotes", {braces} and [brackets] and \\backslash' },
    ]);
  });

  it("returns nothing before the array starts", () => {
    expect(extractCompleteArrayItems('{"hook":"x","secti', "sections")).toEqual([]);
  });
});

describe("closing brackets in the wrong order (seen from the lite models on long replies)", () => {
  it("repairs a slide whose notes and slide closers are swapped, ignoring text after the reply", () => {
    // Real ending: ...}],"minutes":4}]}],"tag":"compiled-languages","type":"json"}
    const text =
      '{"slides":[{"layout":"comparison","title":"T","notes":{"say":"S","doubts":[{"doubt":"D","answer":"A"}],"minutes":4}]}],"tag":"x","type":"json"}';
    expect(parseJsonReply(text)).toEqual({
      slides: [
        {
          layout: "comparison",
          title: "T",
          notes: { say: "S", doubts: [{ doubt: "D", answer: "A" }], minutes: 4 },
        },
      ],
    });
  });

  it("repairs an extra closer at the end", () => {
    // Real ending: ...fine."}],"minutes":3}}}]}
    const text =
      '{"slides":[{"layout":"statement","text":"X","notes":{"doubts":[{"doubt":"D","answer":"fine."}],"minutes":3}}}]}';
    expect(parseJsonReply(text)).toEqual({
      slides: [
        {
          layout: "statement",
          text: "X",
          notes: { doubts: [{ doubt: "D", answer: "fine." }], minutes: 3 },
        },
      ],
    });
  });

  it("leaves brackets inside strings alone and changes nothing that was already valid", () => {
    expect(balanceBrackets('{"a":"]}"}')).toBeNull();
    expect(parseJsonReply('{"a":"x ] y }"}')).toEqual({ a: "x ] y }" });
  });
});
