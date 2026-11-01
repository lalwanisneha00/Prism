import { MathText } from "@/components/mock/MathText";
import { optionLabel, PaperHeader } from "@/components/mock/PaperView";
import type { Paper } from "@/lib/mock/paper";

const markWord = (m: number) => `${m} ${m === 1 ? "mark" : "marks"}`;

/**
 * The answer sheet: for every question the model answer and where the marks go; for MCQs the
 * right option and why. Only rendered after the student finishes the paper.
 */
export function AnswerSheetView({
  paper,
  subjectName,
  scopeLabel,
}: {
  paper: Paper;
  subjectName: string;
  scopeLabel: string;
}) {
  let n = 0;
  return (
    <article
      className="mock-paper flex flex-col gap-5 font-serif leading-relaxed"
      data-testid="answer-sheet"
    >
      <PaperHeader
        paper={paper}
        subjectName={subjectName}
        scopeLabel={scopeLabel}
        heading="Answer sheet and marking scheme"
      />
      {paper.sections.map((s) => (
        <section key={s.id} className="flex flex-col gap-3">
          <h3 className="text-center font-bold">{s.name}</h3>
          {s.attempt && (
            <p className="text-center text-sm italic">
              Any {s.attempt} of {s.questions.length} count.
            </p>
          )}
          <ol className="flex flex-col gap-4">
            {s.questions.map((q) => {
              const number = ++n;
              const right = q.options?.indexOf(q.answer) ?? -1;
              return (
                <li
                  key={q.id}
                  className="mock-question flex break-inside-avoid flex-col gap-2 border-b border-border pb-4"
                >
                  <div className="flex gap-3">
                    <span className="w-8 shrink-0 font-semibold">Q{number}.</span>
                    <MathText className="min-w-0 flex-1 text-sm opacity-80">{q.question}</MathText>
                    <span className="shrink-0 font-semibold tabular-nums">[{q.marks}]</span>
                  </div>
                  <div className="ml-11 flex flex-col gap-2">
                    {q.type === "mcq" ? (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="font-semibold">
                            Answer: {right >= 0 ? optionLabel(right) : ""}
                          </span>
                          <MathText className="min-w-0 flex-1">{q.answer}</MathText>
                        </div>
                        {q.reason && (
                          <div className="text-sm">
                            <span className="font-semibold">Why: </span>
                            <MathText className="inline-block">{q.reason}</MathText>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="font-semibold">Model answer</p>
                        <MathText>{q.answer}</MathText>
                        {q.scheme.length > 0 && (
                          <div className="rounded-lg border border-border p-3 text-sm">
                            <p className="mb-1 font-semibold">Marking scheme</p>
                            <ul className="flex flex-col gap-1">
                              {q.scheme.map((p, i) => (
                                <li key={`${i}-${p.point}`} className="flex items-baseline gap-2">
                                  <span className="w-20 shrink-0 font-semibold whitespace-nowrap tabular-nums">
                                    {markWord(p.marks)}:
                                  </span>
                                  <MathText className="min-w-0 flex-1">{p.point}</MathText>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </article>
  );
}
