import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/Container";
import accuracy from "@/data/accuracy.json";
import { subjects } from "@/lib/subjects";
import { tierCopy, type TrustTier } from "@/lib/tiers";

export const metadata: Metadata = { title: "How accurate is Prism?" };

type SubjectScore = {
  goldenTopics: number;
  facts: number;
  percent: number;
  validLessons: number;
  lessons: number;
  date: string;
  level: string;
};

const scores = (accuracy as { subjects: Record<string, SubjectScore> }).subjects;
const tiers: TrustTier[] = ["verified", "sourced", "limited"];

/** The public accuracy page (SPEC §6.1 rule 12): each subject's tier and latest measured score. */
export default function AccuracyPage() {
  return (
    <Container className="flex flex-col gap-8 py-10 sm:py-14">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">How accurate is Prism?</h1>
        <p className="mt-2 max-w-2xl text-muted">
          We don&apos;t just hope lessons are right; we measure it. Each subject has a{" "}
          <b>golden set</b>: topics with key facts taken from the free textbooks the lessons cite.
          We generate a real lesson for every topic and count how many of those facts it states
          correctly. A subject is <b>verified</b> only when it scores at least 95%.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Subjects</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th scope="col" className="px-4 py-2">
                  Subject
                </th>
                <th scope="col" className="px-4 py-2">
                  Tier
                </th>
                <th scope="col" className="px-4 py-2">
                  Golden set
                </th>
                <th scope="col" className="px-4 py-2">
                  Latest score
                </th>
                <th scope="col" className="px-4 py-2">
                  Measured
                </th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => {
                const score = scores[s.id];
                return (
                  <tr key={s.id} className="border-t border-border bg-surface">
                    <th scope="row" className="px-4 py-3 font-semibold">
                      {s.name}
                    </th>
                    <td className="px-4 py-3">{tierCopy[s.tier].badge}</td>
                    <td className="px-4 py-3">
                      {score
                        ? `${score.goldenTopics} topics · ${score.facts} facts`
                        : "Not yet measured"}
                    </td>
                    <td className="px-4 py-3">
                      {score ? (
                        <span
                          className={
                            score.percent >= 95
                              ? "font-bold text-success"
                              : "font-bold text-warning"
                          }
                        >
                          {score.percent}%
                        </span>
                      ) : (
                        "—"
                      )}
                      {score && score.validLessons < score.lessons && (
                        <span className="block text-xs text-muted">
                          {score.lessons - score.validLessons} lesson(s) failed to generate (counted
                          as 0)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {score ? `${score.date} · ${score.level.replace(/-/g, " ")}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">What the tiers mean</h2>
        <ul className="flex flex-col gap-2">
          {tiers.map((t) => (
            <li key={t} className="rounded-xl border border-border bg-surface p-3 text-sm">
              <span className="font-semibold">{tierCopy[t].badge}</span>: {tierCopy[t].explain}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2 text-sm text-muted">
        <h2 className="text-xl font-bold text-fg">Every lesson also gets</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Sources: every section cites the trusted pages it was written from.</li>
          <li>
            A fact-check pass that compares the lesson with those sources (Sourced ✓ / Verify ⚠
            badges).
          </li>
          <li>
            Computer checks: every formula must render, and numeric worked-example answers are
            recalculated with a maths library.
          </li>
          <li>
            Visuals drawn by tested code from validated data; charts say whether their numbers are
            computed, sourced or illustrative.
          </li>
        </ul>
        <p>
          AI can still make mistakes. If something looks wrong, compare it with the cited source or
          your textbook.{" "}
          <Link href="/#start" className="font-semibold text-primary underline">
            Start a lesson
          </Link>
        </p>
      </section>
    </Container>
  );
}
