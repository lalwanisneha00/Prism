import { Container } from "@/components/Container";
import { LessonPicker } from "@/components/LessonPicker";
import { PrismArt } from "@/components/PrismArt";
import { RecentTopics } from "@/components/RecentTopics";
import { GlobalSearch } from "@/components/subjects/GlobalSearch";
import { site } from "@/lib/site";
import { subjects } from "@/lib/subjects";

const steps = [
  {
    title: "Pick your topic",
    body: "Choose the chapter and topic, how well you know it, and how much time you have.",
  },
  {
    title: "Get a lesson that fits",
    body: "Plain-language explanations, interactive visuals, worked examples, and a source for every claim.",
  },
  {
    title: "Listen, practise, revise",
    body: "An audio lesson for the bus ride, a quick quiz, and a one-page revision sheet.",
  },
];

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const pick = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  return (
    <>
      <section className="py-12 sm:py-20">
        <Container className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary">
              Now teaching: {subjects.map((s) => s.name).join(" · ")}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              The topic your professor rushed,{" "}
              <span className="text-spectrum">explained clearly</span>.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-pretty text-muted">{site.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#start"
                className="rounded-full bg-primary px-6 py-3 text-center font-semibold text-primary-fg transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Start a lesson
              </a>
              <a
                href="#how"
                className="rounded-full border border-border bg-surface px-6 py-3 text-center font-semibold text-fg transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                How it works
              </a>
            </div>
          </div>
          <PrismArt className="mx-auto w-full max-w-sm" />
        </Container>
      </section>

      <section id="how" className="scroll-mt-20 py-12">
        <Container>
          <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-border bg-surface p-5">
                <span className="grid size-8 place-items-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section id="start" className="scroll-mt-20 py-12">
        <Container>
          <div className="flex flex-col gap-6">
            <GlobalSearch />
            <RecentTopics />
            <LessonPicker
              // A new choice from search or a subject page starts the picker afresh.
              key={`${pick(params.subject)}-${pick(params.chapter)}-${pick(params.topic)}`}
              subjects={subjects}
              initial={{
                subject: pick(params.subject),
                chapter: pick(params.chapter),
                topic: pick(params.topic),
              }}
            />
          </div>
        </Container>
      </section>
    </>
  );
}
