import type { Worksheet } from "@/lib/worksheet/schema";

/** A canned worksheet for LLM_PROVIDER=fake: as many questions as the prompt asks for. */
export function fakeWorksheet(prompt: string): Worksheet {
  const pyq = [...prompt.matchAll(/^\d+\. (.+)$/gm)].map((m) => m[1]);
  const isPyq = prompt.includes("past-paper questions");
  const count = isPyq ? pyq.length : Number(/exactly (\d+) exam questions/.exec(prompt)?.[1] ?? 4);
  return {
    questions: Array.from({ length: Math.max(1, count) }, (_, i) => {
      const marks = [2, 5, 10][Math.min(2, Math.floor((i * 3) / Math.max(1, count)))];
      return {
        question: isPyq
          ? pyq[i]
          : String.raw`Test question ${i + 1}: state the law and find $E$ at $r = 2\,\text{m}$.`,
        marks,
        steps: [
          String.raw`Write the law: $\oint \vec E \cdot d\vec A = Q/\varepsilon_0$.`,
          "Substitute the values.",
        ],
        answer: String.raw`$E = 2.2 \times 10^{3}\ \text{N/C}$`,
        markingPoints: ["Correct statement (1 mark)", "Correct substitution and units (1 mark)"],
      };
    }),
  };
}
