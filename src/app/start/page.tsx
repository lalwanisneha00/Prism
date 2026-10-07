import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { LessonPicker } from "@/components/LessonPicker";
import { RecentTopics } from "@/components/RecentTopics";
import { GlobalSearch } from "@/components/subjects/GlobalSearch";
import { subjects } from "@/lib/subjects";

export const metadata: Metadata = { title: "Start a lesson" };

/** The lesson maker on its own page (the same one as on the home page, without the introduction). */
export default async function StartPage({ searchParams }: PageProps<"/start">) {
  const params = await searchParams;
  const pick = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
  return (
    <Container className="flex flex-col gap-6 py-8 sm:py-12">
      <h1 className="text-3xl font-bold tracking-tight">Start a lesson</h1>
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
          level: pick(params.level),
          duration: pick(params.duration),
        }}
      />
    </Container>
  );
}
