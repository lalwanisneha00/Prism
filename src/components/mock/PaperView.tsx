import { MathText } from "@/components/mock/MathText";
import type { Paper, PaperQuestion } from "@/lib/mock/paper";

/** "(a)", "(b)"…: how printed papers label options and sub-parts. */
export const optionLabel = (i: number) => `(${"abcdef"[i] ?? i + 1})`;

const marksText = (m: number) => `[${m}]`;

/** The paper's heading, as on a university question paper. */
export function PaperHeader({
  paper,
  subjectName,
  scopeLabel,
  heading,
}: {
  paper: Paper;
  subjectName: string;
  scopeLabel: string;
  heading: string;
}) {
  return (
    <header className="mock-paper-header flex flex-col items-center gap-1 border-b-2 border-fg/70 pb-3 text-center">
      <p className="text-xs tracking-widest uppercase">{heading}</p>
      <h2 className="text-xl font-bold">{subjectName}</h2>
      <p className="text-sm">{scopeLabel}</p>
      <div className="mt-1 flex w-full justify-between gap-3 text-sm font-semibold">
        <span>Time: {formatMinutes(paper.minutes)}</span>
        <span>Max. Marks: {paper.totalMarks}</span>
      </div>
    </header>
  );
}

export function formatMinutes(m: number): string {
  if (m < 60) return `${m} minutes`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return `${h} ${h === 1 ? "hour" : "hours"}${rest ? ` ${rest} minutes` : ""}`;
}

/** One question with its number and the marks on the right. */
function QuestionRow({ q, number }: { q: PaperQuestion; number: number }) {
  return (
    <li className="mock-question flex break-inside-avoid gap-3">
      <span className="w-8 shrink-0 font-semibold">Q{number}.</span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <MathText>{q.question}</MathText>
        {q.type === "mcq" && q.options && (
          <ol className="grid gap-1.5 sm:grid-cols-2" aria-label={`Options for question ${number}`}>
            {q.options.map((o, i) => (
              <li key={`${i}-${o}`} className="flex items-baseline gap-2">
                <span className="w-7 shrink-0 font-semibold">{optionLabel(i)}</span>
                <MathText className="min-w-0 flex-1">{o}</MathText>
              </li>
            ))}
          </ol>
        )}
        {q.source === "pyq-repeat" && <p className="text-xs italic">(Previous-year question)</p>}
      </div>
      <span className="shrink-0 font-semibold tabular-nums" aria-label={`${q.marks} marks`}>
        {marksText(q.marks)}
      </span>
    </li>
  );
}

/** The question paper itself: instructions, sections, internal choice, marks on the right. */
export function PaperView({
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
      data-testid="mock-paper"
    >
      <PaperHeader
        paper={paper}
        subjectName={subjectName}
        scopeLabel={scopeLabel}
        heading="Mock examination"
      />
      <div className="text-sm">
        <p className="font-semibold">Instructions:</p>
        <ol className="list-decimal pl-5">
          <li>Write your answers on paper.</li>
          <li>Figures to the right indicate full marks.</li>
          <li>Where a section offers a choice, answer only the number of questions asked.</li>
          <li>Draw neat, labelled diagrams wherever necessary.</li>
        </ol>
      </div>
      {paper.sections.map((s) => (
        <section key={s.id} className="flex flex-col gap-3">
          <h3 className="text-center font-bold">{s.name}</h3>
          {(s.instructions || s.attempt) && (
            <p className="text-center text-sm italic">
              {s.attempt
                ? `Attempt any ${s.attempt} of the following ${s.questions.length} questions.`
                : s.instructions}
            </p>
          )}
          <ol className="flex flex-col gap-4">
            {s.questions.map((q) => (
              <QuestionRow key={q.id} q={q} number={++n} />
            ))}
          </ol>
        </section>
      ))}
      <p className="text-center text-sm">*** End of paper ***</p>
    </article>
  );
}
