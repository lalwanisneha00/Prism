import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CodeChecks } from "@/components/lesson/CodeChecks";
import { Markdown } from "@/components/lesson/Markdown";
import { findCodeSamples } from "@/lib/code/codeBlocks";

const body = [
  "A loop:",
  "```python",
  "for i in range(3):",
  "    print(i)",
  "```",
  "```output",
  "0",
  "1",
  "2",
  "```",
  "And in C:",
  "```c",
  "int main(void) { return 0; }",
  "```",
].join("\n");

describe("code checks in a lesson section", () => {
  it("lists each sample with a way to run it, before anything has run", () => {
    const html = renderToStaticMarkup(<CodeChecks samples={findCodeSamples(body)} />);
    expect(html).toContain("Sample 1 (Python)");
    expect(html).toContain("Run and check");
    expect(html).toContain("Sample 2 (C)");
    expect(html).toContain("Not run yet");
  });

  it("shows nothing when a section has no code", () => {
    expect(renderToStaticMarkup(<CodeChecks samples={[]} />)).toBe("");
  });

  it("renders code blocks as scrollable pre blocks, not inline code", () => {
    const html = renderToStaticMarkup(<Markdown>{body}</Markdown>);
    expect(html).toContain('<pre class="overflow-x-auto');
    expect(html).toContain('class="language-python"');
  });
});
