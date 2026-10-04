import { describe, expect, it } from "vitest";
import { codeVerdict, findCodeSamples, languageOf, sameOutput } from "@/lib/code/codeBlocks";

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

describe("code check verdicts", () => {
  const sample = { language: "python" as const, code: "print(1+1)", expected: "2" };
  it("passes matching output and flags different output", () => {
    expect(codeVerdict(sample, { status: "ran", output: "2\n" }).tone).toBe("success");
    const differs = codeVerdict(sample, { status: "ran", output: "3" });
    expect(differs.tone).toBe("danger");
    expect(differs.text).toContain("differs");
  });
  it("labels samples that were not run, errors and endless loops", () => {
    expect(codeVerdict(sample, { status: "idle" }).text).toContain("Not run yet");
    expect(codeVerdict(sample, { status: "not-executed", reason: "C isn't run." }).tone).toBe(
      "warning",
    );
    expect(codeVerdict(sample, { status: "error", output: "", error: "NameError" }).text).toContain(
      "NameError",
    );
    expect(codeVerdict(sample, { status: "timeout", output: "" }).tone).toBe("danger");
    expect(
      codeVerdict({ ...sample, expected: undefined }, { status: "ran", output: "" }).tone,
    ).toBe("success");
  });
});
