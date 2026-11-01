import { describe, expect, it } from "vitest";
import { AnswerSheetView } from "@/components/mock/AnswerSheetView";
import { PaperFlow } from "@/components/mock/PaperFlow";
import { PaperView } from "@/components/mock/PaperView";
import type { Paper } from "@/lib/mock/paper";
import { renderSettled } from "@/visuals/renderSettled";

/** The static HTML with React's text separators removed, so joined text can be searched. */
const render = async (el: Parameters<typeof renderSettled>[0]) =>
  (await renderSettled(el)).replace(/<!-- -->/g, "");

const paper: Paper = {
  title: "Maths: Unit 1",
  subject: "maths",
  totalMarks: 4,
  minutes: 10,
  sections: [
    {
      id: "s1",
      name: "Section A",
      questions: [
        {
          id: "s1q1",
          type: "mcq",
          topic: "complex",
          marks: 1,
          question: "Which number squares to $-1$?",
          options: ["$\\sqrt{-1}$", "$\\pi$", "$1$", "$e$"],
          answer: "$\\sqrt{-1}$",
          reason: "SECRET-REASON: by definition $i^2 = -1$.",
          scheme: [],
          source: "lesson",
        },
      ],
    },
    {
      id: "s2",
      name: "Section B",
      attempt: 1,
      questions: [3, 3].map((marks, i) => ({
        id: `s2q${i + 1}`,
        type: "short" as const,
        topic: "complex",
        marks,
        question: `Explain Euler's identity, part ${i + 1}.`,
        answer: `SECRET-ANSWER ${i + 1}: $e^{i\\pi} + 1 = 0$ links five constants.`,
        scheme: [
          { point: "Names the constants", marks: 1.5 },
          { point: "Explains the link", marks: 1.5 },
        ],
        source: "lesson" as const,
      })),
    },
  ],
};

const noop = async () => {};

describe("paper mode", () => {
  it("shows only the paper before Finish: no answers, reasons or marking scheme", async () => {
    const html = await render(
      <PaperFlow
        paper={paper}
        subjectName="Maths"
        scopeLabel="Unit 1"
        onSave={noop}
        onRetake={() => {}}
        onDone={() => {}}
      />,
    );
    expect(html).toContain("Which number squares to");
    expect(html).toContain("Start timer");
    expect(html).toContain("Finish mock test");
    expect(html).not.toContain("SECRET-ANSWER");
    expect(html).not.toContain("SECRET-REASON");
    expect(html).not.toContain("Marking scheme");
    expect(html).not.toContain('data-testid="answer-sheet"');
    expect(html).not.toContain("Your total marks");
  });

  it("prints a real exam paper: header, (a)-(d) options, marks, internal choice, KaTeX maths", async () => {
    const html = await render(<PaperView paper={paper} subjectName="Maths" scopeLabel="Unit 1" />);
    expect(html).toContain("Max. Marks: 4");
    expect(html).toContain("Time: 10 minutes");
    for (const label of ["(a)", "(b)", "(c)", "(d)"]) expect(html).toContain(label);
    expect(html).toContain("Attempt any 1 of the following 2 questions.");
    expect(html).toContain("[3]");
    expect(html).toContain('class="katex"');
  });

  it("the answer sheet gives the right option with its reason, model answers and where the marks go", async () => {
    const html = await render(
      <AnswerSheetView paper={paper} subjectName="Maths" scopeLabel="Unit 1" />,
    );
    expect(html).toContain("Answer: (a)");
    expect(html).toContain("SECRET-REASON");
    expect(html).toContain("SECRET-ANSWER 1");
    expect(html).toContain("Marking scheme");
    expect(html).toContain("1.5 marks");
  });

  it("never shows raw LaTeX or stray backslashes in rendered text", async () => {
    const messy: Paper = {
      ...paper,
      sections: [
        {
          ...paper.sections[0],
          questions: [
            {
              ...paper.sections[0].questions[0],
              options: ["\\sqrt{-1}", "\\\\pi", "\\frac{a}{b}", "$\\badmacro{x}$"],
            },
          ],
        },
      ],
    };
    const html = await render(<PaperView paper={messy} subjectName="Maths" scopeLabel="Unit 1" />);
    // Text outside KaTeX's own markup (which keeps the source in an <annotation>) has no backslashes.
    const visible = html.replace(/<annotation[\s\S]*?<\/annotation>/g, "").replace(/<[^>]+>/g, " ");
    expect(visible).not.toMatch(/\\[a-zA-Z]/);
    expect(visible).not.toContain("\\");
  });
});
