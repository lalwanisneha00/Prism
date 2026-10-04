import { describe, expect, it } from "vitest";
import { findCodeSamples, languageOf, sameOutput } from "@/lib/code/codeBlocks";

describe("code samples in lessons", () => {
  it("finds samples with their claimed output", () => {
    const md = [
      "A loop:",
      "```python",
      "for i in range(3):",
      "    print(i)",
      "```",
      "Output:",
      "```",
      "0",
      "1",
      "2",
      "```",
      "And in C:",
      "```c",
      'printf("hi");',
      "```",
      "```output",
      "hi",
      "```",
      "No output shown here:",
      "```js",
      "console.log(1 + 1)",
      "```",
    ].join("\n");
    const samples = findCodeSamples(md);
    expect(samples.map((s) => s.language)).toEqual(["python", "c", "javascript"]);
    expect(samples[0].expected).toBe("0\n1\n2");
    expect(samples[1].expected).toBe("hi");
    expect(samples[2].expected).toBeUndefined();
  });

  it("ignores plain text blocks and unknown languages", () => {
    expect(findCodeSamples("```text\nhello\n```\n```rust\nfn main(){}\n```")).toEqual([]);
    expect(languageOf("PY")).toBe("python");
  });

  it("compares outputs, ignoring trailing spaces and blank edges", () => {
    expect(sameOutput("0\n1 \n2\n\n", "0\n1\n2")).toBe(true);
    expect(sameOutput("0\n1", "0\n2")).toBe(false);
  });
});
