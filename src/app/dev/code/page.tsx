import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { CodeChecks } from "@/components/lesson/CodeChecks";
import { Markdown } from "@/components/lesson/Markdown";
import { findCodeSamples } from "@/lib/code/codeBlocks";

export const metadata: Metadata = {
  title: "Code checks (dev)",
  robots: { index: false },
};

const fence = "```";

/** A programming-lesson section with samples that pass, fail and can't run (V3 · Step 5). */
const body = [
  "A loop that counts:",
  `${fence}javascript`,
  "for (let i = 0; i < 3; i++) console.log(i);",
  fence,
  `${fence}output`,
  "0\n1\n2",
  fence,
  "A sample whose claimed output is wrong:",
  `${fence}javascript`,
  "console.log(0.1 + 0.2);",
  fence,
  `${fence}output`,
  "0.3",
  fence,
  "The same loop in Python:",
  `${fence}python`,
  "for i in range(3):\n    print(i)",
  fence,
  `${fence}output`,
  "0\n1\n2",
  fence,
  "And in C:",
  `${fence}c`,
  '#include <stdio.h>\nint main(void) { printf("hi\n"); return 0; }',
  fence,
].join("\n");

export default function CodeChecksPage() {
  return (
    <Container className="flex flex-col gap-4 py-10">
      <h1 className="text-2xl font-bold">Code checks (dev)</h1>
      <Markdown>{body}</Markdown>
      <CodeChecks samples={findCodeSamples(body)} />
    </Container>
  );
}
